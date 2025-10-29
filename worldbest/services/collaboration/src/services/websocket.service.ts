import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { 
  CollaborationEvent, 
  EventType, 
  Operation, 
  UserPresence, 
  PresenceUpdate,
  CollaborationSession 
} from '../types/collaboration.types.js';
import { CollaborationService } from './collaboration.service.js';
import { v4 as uuidv4 } from 'uuid';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  email?: string;
  sessionId?: string;
  documentId?: string;
}

export class WebSocketService {
  private io: SocketIOServer;
  private collaborationService: CollaborationService;
  private connectedUsers: Map<string, AuthenticatedSocket> = new Map();
  private documentRooms: Map<string, Set<string>> = new Map(); // documentId -> Set of socketIds

  constructor(httpServer: HTTPServer, collaborationService: CollaborationService) {
    this.collaborationService = collaborationService;
    
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    this.startHeartbeat();
  }

  /**
   * Setup authentication and validation middleware
   */
  private setupMiddleware(): void {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        // Extract authentication token
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Validate token and extract user info
        // In a real implementation, this would verify JWT token
        const userData = await this.validateToken(token);
        
        if (!userData) {
          return next(new Error('Invalid authentication token'));
        }

        socket.userId = userData.userId;
        socket.username = userData.username;
        socket.email = userData.email;

        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.username} connected: ${socket.id}`);
      
      this.connectedUsers.set(socket.id, socket);

      // Handle joining a document collaboration session
      socket.on('join-document', async (data: { documentId: string }) => {
        await this.handleJoinDocument(socket, data.documentId);
      });

      // Handle leaving a document collaboration session
      socket.on('leave-document', async (data: { documentId: string }) => {
        await this.handleLeaveDocument(socket, data.documentId);
      });

      // Handle operation submission
      socket.on('operation', async (operation: Operation) => {
        await this.handleOperation(socket, operation);
      });

      // Handle presence updates (cursor, selection, typing)
      socket.on('presence-update', async (presenceData: PresenceUpdate) => {
        await this.handlePresenceUpdate(socket, presenceData);
      });

      // Handle comments
      socket.on('add-comment', async (data: {
        documentId: string;
        content: string;
        position: { start: number; end: number; selectedText?: string };
      }) => {
        await this.handleAddComment(socket, data);
      });

      socket.on('resolve-comment', async (data: {
        documentId: string;
        commentId: string;
      }) => {
        await this.handleResolveComment(socket, data);
      });

      // Handle suggestions
      socket.on('add-suggestion', async (data: {
        documentId: string;
        type: 'insertion' | 'deletion' | 'replacement' | 'formatting';
        position: { start: number; end: number };
        originalText: string;
        suggestedText: string;
        description?: string;
      }) => {
        await this.handleAddSuggestion(socket, data);
      });

      socket.on('review-suggestion', async (data: {
        documentId: string;
        suggestionId: string;
        status: 'accepted' | 'rejected';
        reviewComment?: string;
      }) => {
        await this.handleReviewSuggestion(socket, data);
      });

      // Handle chat messages
      socket.on('chat-message', async (data: {
        documentId: string;
        message: string;
        replyTo?: string;
      }) => {
        await this.handleChatMessage(socket, data);
      });

      // Handle typing indicators
      socket.on('typing-start', async (data: { documentId: string }) => {
        await this.handleTypingStart(socket, data.documentId);
      });

      socket.on('typing-stop', async (data: { documentId: string }) => {
        await this.handleTypingStop(socket, data.documentId);
      });

      // Handle document locking
      socket.on('lock-document', async (data: {
        documentId: string;
        lockType: 'full_document' | 'paragraph' | 'selection';
        position?: { start: number; end: number };
        duration?: number;
      }) => {
        await this.handleLockDocument(socket, data);
      });

      socket.on('release-lock', async (data: {
        documentId: string;
        lockId: string;
      }) => {
        await this.handleReleaseLock(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', async (reason) => {
        await this.handleDisconnect(socket, reason);
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`Socket error for user ${socket.username}:`, error);
      });
    });
  }

  /**
   * Handle user joining a document collaboration session
   */
  private async handleJoinDocument(socket: AuthenticatedSocket, documentId: string): Promise<void> {
    try {
      if (!socket.userId) return;

      // Create collaboration session
      const session = await this.collaborationService.joinSession(
        documentId,
        socket.userId,
        socket.id
      );

      if (!session) {
        socket.emit('error', { message: 'Unable to join document session' });
        return;
      }

      socket.sessionId = session.id;
      socket.documentId = documentId;

      // Join socket room for the document
      socket.join(documentId);

      // Add to document rooms tracking
      if (!this.documentRooms.has(documentId)) {
        this.documentRooms.set(documentId, new Set());
      }
      this.documentRooms.get(documentId)!.add(socket.id);

      // Get document and send current state
      const document = await this.collaborationService.getDocument(documentId);
      const activeUsers = await this.collaborationService.getActiveUsers(documentId);
      const comments = await this.collaborationService.getComments(documentId);
      const suggestions = await this.collaborationService.getSuggestions(documentId);

      // Send current document state to the joining user
      socket.emit('document-state', {
        document,
        activeUsers,
        comments,
        suggestions
      });

      // Notify other users about the new participant
      socket.to(documentId).emit('user-joined', {
        userId: socket.userId,
        username: socket.username,
        timestamp: new Date()
      });

      // Send active users list to the joining user
      socket.emit('active-users', activeUsers);

      console.log(`User ${socket.username} joined document ${documentId}`);

    } catch (error) {
      console.error('Error joining document:', error);
      socket.emit('error', { message: 'Failed to join document' });
    }
  }

  /**
   * Handle user leaving a document collaboration session
   */
  private async handleLeaveDocument(socket: AuthenticatedSocket, documentId: string): Promise<void> {
    try {
      if (!socket.sessionId) return;

      // Leave socket room
      socket.leave(documentId);

      // Remove from document rooms tracking
      const documentRoom = this.documentRooms.get(documentId);
      if (documentRoom) {
        documentRoom.delete(socket.id);
        if (documentRoom.size === 0) {
          this.documentRooms.delete(documentId);
        }
      }

      // End collaboration session
      await this.collaborationService.leaveSession(socket.sessionId);

      // Notify other users
      socket.to(documentId).emit('user-left', {
        userId: socket.userId,
        username: socket.username,
        timestamp: new Date()
      });

      // Clear socket session data
      socket.sessionId = undefined;
      socket.documentId = undefined;

      console.log(`User ${socket.username} left document ${documentId}`);

    } catch (error) {
      console.error('Error leaving document:', error);
    }
  }

  /**
   * Handle collaborative operations
   */
  private async handleOperation(socket: AuthenticatedSocket, operation: Operation): Promise<void> {
    try {
      if (!socket.userId || !socket.documentId) {
        socket.emit('error', { message: 'Invalid session state' });
        return;
      }

      // Set operation metadata
      operation.userId = socket.userId;
      operation.clientId = socket.id;
      operation.timestamp = new Date();

      // Apply operation through collaboration service
      const result = await this.collaborationService.applyOperation(operation);

      if (result.success) {
        // Send transformed operation back to the sender
        socket.emit('operation-applied', {
          originalOperation: operation,
          transformedOperations: result.transformedOperations,
          newVersion: result.newVersion
        });

        // Broadcast transformed operation to other collaborators
        socket.to(socket.documentId).emit('remote-operation', {
          operations: result.transformedOperations,
          userId: socket.userId,
          username: socket.username,
          version: result.newVersion
        });

        // Update last activity
        await this.updateUserActivity(socket);

      } else {
        // Send error back to client
        socket.emit('operation-failed', {
          operation,
          error: result.error,
          conflicts: result.conflicts
        });
      }

    } catch (error) {
      console.error('Error handling operation:', error);
      socket.emit('error', { message: 'Failed to apply operation' });
    }
  }

  /**
   * Handle presence updates (cursor position, selection, typing status)
   */
  private async handlePresenceUpdate(socket: AuthenticatedSocket, presenceData: PresenceUpdate): Promise<void> {
    try {
      if (!socket.userId || !socket.documentId) return;

      // Update presence in collaboration service
      await this.collaborationService.updatePresence(
        socket.documentId,
        socket.userId,
        {
          username: socket.username!,
          cursor: presenceData.cursor,
          selection: presenceData.selection,
          isTyping: presenceData.isTyping
        }
      );

      // Broadcast presence update to other users in the document
      socket.to(socket.documentId).emit('presence-update', {
        userId: socket.userId,
        username: socket.username,
        cursor: presenceData.cursor,
        selection: presenceData.selection,
        isTyping: presenceData.isTyping,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error handling presence update:', error);
    }
  }

  /**
   * Handle adding comments
   */
  private async handleAddComment(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      if (!socket.userId || !socket.username) return;

      const comment = await this.collaborationService.addComment(
        data.documentId,
        socket.userId,
        socket.username,
        data.content,
        data.position
      );

      // Broadcast new comment to all users in the document
      this.io.to(data.documentId).emit('comment-added', {
        comment,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error adding comment:', error);
      socket.emit('error', { message: 'Failed to add comment' });
    }
  }

  /**
   * Handle resolving comments
   */
  private async handleResolveComment(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      if (!socket.userId) return;

      const success = await this.collaborationService.resolveComment(
        data.documentId,
        data.commentId,
        socket.userId
      );

      if (success) {
        // Broadcast comment resolution to all users
        this.io.to(data.documentId).emit('comment-resolved', {
          commentId: data.commentId,
          resolvedBy: socket.userId,
          username: socket.username,
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error('Error resolving comment:', error);
      socket.emit('error', { message: 'Failed to resolve comment' });
    }
  }

  /**
   * Handle adding suggestions
   */
  private async handleAddSuggestion(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      if (!socket.userId || !socket.username) return;

      const suggestion = await this.collaborationService.addSuggestion(
        data.documentId,
        socket.userId,
        socket.username,
        data.type,
        data.position,
        data.originalText,
        data.suggestedText,
        data.description
      );

      // Broadcast new suggestion to all users
      this.io.to(data.documentId).emit('suggestion-added', {
        suggestion,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error adding suggestion:', error);
      socket.emit('error', { message: 'Failed to add suggestion' });
    }
  }

  /**
   * Handle reviewing suggestions
   */
  private async handleReviewSuggestion(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      if (!socket.userId) return;

      const success = await this.collaborationService.reviewSuggestion(
        data.documentId,
        data.suggestionId,
        socket.userId,
        data.status,
        data.reviewComment
      );

      if (success) {
        // Broadcast suggestion review to all users
        this.io.to(data.documentId).emit('suggestion-reviewed', {
          suggestionId: data.suggestionId,
          status: data.status,
          reviewedBy: socket.userId,
          username: socket.username,
          reviewComment: data.reviewComment,
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error('Error reviewing suggestion:', error);
      socket.emit('error', { message: 'Failed to review suggestion' });
    }
  }

  /**
   * Handle chat messages
   */
  private async handleChatMessage(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      if (!socket.userId || !socket.username) return;

      const message = {
        id: uuidv4(),
        documentId: data.documentId,
        userId: socket.userId,
        username: socket.username,
        message: data.message,
        replyTo: data.replyTo,
        timestamp: new Date()
      };

      // Broadcast chat message to all users in the document
      this.io.to(data.documentId).emit('chat-message', message);

    } catch (error) {
      console.error('Error handling chat message:', error);
    }
  }

  /**
   * Handle typing start indicator
   */
  private async handleTypingStart(socket: AuthenticatedSocket, documentId: string): Promise<void> {
    if (!socket.userId) return;

    socket.to(documentId).emit('user-typing-start', {
      userId: socket.userId,
      username: socket.username,
      timestamp: new Date()
    });
  }

  /**
   * Handle typing stop indicator
   */
  private async handleTypingStop(socket: AuthenticatedSocket, documentId: string): Promise<void> {
    if (!socket.userId) return;

    socket.to(documentId).emit('user-typing-stop', {
      userId: socket.userId,
      username: socket.username,
      timestamp: new Date()
    });
  }

  /**
   * Handle document locking
   */
  private async handleLockDocument(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      if (!socket.userId) return;

      const lock = await this.collaborationService.lockDocument(
        data.documentId,
        socket.userId,
        data.lockType,
        data.position,
        data.duration
      );

      // Broadcast lock to other users
      socket.to(data.documentId).emit('document-locked', {
        lock,
        lockedBy: socket.username,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error locking document:', error);
      socket.emit('error', { message: 'Failed to lock document' });
    }
  }

  /**
   * Handle releasing document locks
   */
  private async handleReleaseLock(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      if (!socket.userId) return;

      const success = await this.collaborationService.releaseLock(
        data.documentId,
        data.lockId,
        socket.userId
      );

      if (success) {
        // Broadcast lock release to other users
        socket.to(data.documentId).emit('document-unlocked', {
          lockId: data.lockId,
          unlockedBy: socket.username,
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error('Error releasing lock:', error);
    }
  }

  /**
   * Handle user disconnection
   */
  private async handleDisconnect(socket: AuthenticatedSocket, reason: string): Promise<void> {
    try {
      console.log(`User ${socket.username} disconnected: ${reason}`);

      // Clean up session if exists
      if (socket.sessionId) {
        await this.collaborationService.leaveSession(socket.sessionId);
      }

      // Remove from connected users
      this.connectedUsers.delete(socket.id);

      // Clean up document rooms
      if (socket.documentId) {
        const documentRoom = this.documentRooms.get(socket.documentId);
        if (documentRoom) {
          documentRoom.delete(socket.id);
          if (documentRoom.size === 0) {
            this.documentRooms.delete(socket.documentId);
          }
        }

        // Notify other users in the document
        socket.to(socket.documentId).emit('user-disconnected', {
          userId: socket.userId,
          username: socket.username,
          timestamp: new Date(),
          reason
        });
      }

    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  }

  /**
   * Update user activity timestamp
   */
  private async updateUserActivity(socket: AuthenticatedSocket): Promise<void> {
    if (!socket.userId || !socket.documentId) return;

    await this.collaborationService.updatePresence(
      socket.documentId,
      socket.userId,
      { lastSeen: new Date() }
    );
  }

  /**
   * Validate authentication token (mock implementation)
   */
  private async validateToken(token: string): Promise<{ userId: string; username: string; email: string } | null> {
    // In a real implementation, this would validate JWT tokens
    // For now, returning mock data
    try {
      // Remove 'Bearer ' prefix if present
      const cleanToken = token.replace('Bearer ', '');
      
      // Mock validation - in production, use proper JWT verification
      if (cleanToken && cleanToken.length > 10) {
        return {
          userId: 'user-123',
          username: 'Demo User',
          email: 'demo@worldbest.com'
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Start heartbeat for cleanup and maintenance
   */
  private startHeartbeat(): void {
    setInterval(async () => {
      try {
        // Clean up expired locks
        await this.collaborationService.cleanupExpiredLocks();

        // Clean up stale presence data
        await this.cleanupStalePresence();

        // Log statistics
        this.logConnectionStats();

      } catch (error) {
        console.error('Heartbeat error:', error);
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Clean up stale presence data
   */
  private async cleanupStalePresence(): Promise<void> {
    // This would clean up presence data for users who haven't been active
    // Implementation depends on specific requirements
  }

  /**
   * Log connection statistics
   */
  private logConnectionStats(): void {
    const stats = {
      connectedUsers: this.connectedUsers.size,
      activeDocuments: this.documentRooms.size,
      totalRooms: this.io.sockets.adapter.rooms.size
    };

    console.log('WebSocket Stats:', stats);
  }

  /**
   * Get Socket.IO server instance
   */
  public getIO(): SocketIOServer {
    return this.io;
  }

  /**
   * Broadcast event to all users in a document
   */
  public broadcastToDocument(documentId: string, event: string, data: any): void {
    this.io.to(documentId).emit(event, data);
  }

  /**
   * Send event to specific user
   */
  public sendToUser(userId: string, event: string, data: any): void {
    for (const [socketId, socket] of this.connectedUsers.entries()) {
      if (socket.userId === userId) {
        socket.emit(event, data);
        break;
      }
    }
  }

  /**
   * Get connection statistics
   */
  public getStats(): any {
    return {
      connectedUsers: this.connectedUsers.size,
      activeDocuments: this.documentRooms.size,
      documentRooms: Array.from(this.documentRooms.entries()).map(([docId, sockets]) => ({
        documentId: docId,
        activeUsers: sockets.size
      }))
    };
  }
}