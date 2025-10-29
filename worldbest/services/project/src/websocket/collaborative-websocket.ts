import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { CollaborativeEditingService } from '../services/collaborative-editing';
import jwt from 'jsonwebtoken';
import { config } from '../config';

interface AuthenticatedSocket extends Socket {
  userId: string;
  username: string;
  sessionIds: Set<string>;
}

interface Socket {
  id: string;
  handshake: any;
  emit: (event: string, data: any) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  join: (room: string) => void;
  leave: (room: string) => void;
  disconnect: () => void;
  userId?: string;
  username?: string;
  sessionIds?: Set<string>;
}

class CollaborativeWebSocketServer {
  private io: SocketIOServer;
  private collaborativeService: CollaborativeEditingService;
  private connectedUsers: Map<string, Set<string>>; // userId -> socketIds
  private userSockets: Map<string, AuthenticatedSocket>; // socketId -> socket

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: config.cors.allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.collaborativeService = new CollaborativeEditingService();
    this.connectedUsers = new Map();
    this.userSockets = new Map();

    this.setupAuthentication();
    this.setupEventHandlers();
    this.setupCollaborativeServiceListeners();
  }

  private setupAuthentication(): void {
    this.io.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, config.jwt.accessTokenSecret) as any;
        
        socket.userId = decoded.userId;
        socket.username = decoded.username || decoded.email || 'Unknown User';
        socket.sessionIds = new Set();

        // Track connected users
        if (!this.connectedUsers.has(socket.userId)) {
          this.connectedUsers.set(socket.userId, new Set());
        }
        this.connectedUsers.get(socket.userId)!.add(socket.id);
        this.userSockets.set(socket.id, socket);

        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.username} (${socket.userId}) connected with socket ${socket.id}`);

      // Join collaborative session
      socket.on('join-session', async (data: { sessionId: string }) => {
        try {
          const { sessionId } = data;
          
          const session = await this.collaborativeService.joinSession(sessionId, socket.userId);
          
          if (session) {
            socket.join(sessionId);
            socket.sessionIds.add(sessionId);

            // Notify others in the session about new participant
            socket.to(sessionId).emit('user-joined', {
              userId: socket.userId,
              username: socket.username,
              participants: session.participants
            });

            // Send current session state to the joining user
            socket.emit('session-state', {
              sessionId,
              session: this.sanitizeSession(session)
            });

            console.log(`User ${socket.username} joined session ${sessionId}`);
          } else {
            socket.emit('error', { message: 'Session not found or inactive' });
          }
        } catch (error) {
          console.error('Error joining session:', error);
          socket.emit('error', { message: 'Failed to join session' });
        }
      });

      // Leave collaborative session
      socket.on('leave-session', async (data: { sessionId: string }) => {
        try {
          const { sessionId } = data;
          
          await this.collaborativeService.leaveSession(sessionId, socket.userId);
          socket.leave(sessionId);
          socket.sessionIds.delete(sessionId);

          // Notify others in the session
          socket.to(sessionId).emit('user-left', {
            userId: socket.userId,
            username: socket.username
          });

          console.log(`User ${socket.username} left session ${sessionId}`);
        } catch (error) {
          console.error('Error leaving session:', error);
          socket.emit('error', { message: 'Failed to leave session' });
        }
      });

      // Apply operational transform
      socket.on('apply-transform', async (data: {
        sessionId: string;
        operations: any[];
        baseRevision: number;
        metadata?: any;
      }) => {
        try {
          const { sessionId, operations, baseRevision, metadata = {} } = data;

          const result = await this.collaborativeService.applyTransform(sessionId, {
            operations,
            authorId: socket.userId,
            baseRevision,
            metadata
          });

          if (result.success) {
            // Broadcast transform to all other users in the session
            socket.to(sessionId).emit('transform-applied', {
              authorId: socket.userId,
              authorName: socket.username,
              operations: result.transformedOps,
              revision: result.newRevision,
              conflicts: result.conflicts || [],
              timestamp: Date.now()
            });

            // Send confirmation to the author
            socket.emit('transform-confirmed', {
              revision: result.newRevision,
              conflicts: result.conflicts || []
            });

            console.log(`Transform applied in session ${sessionId} by ${socket.username}`);
          } else {
            socket.emit('transform-rejected', {
              error: result.error,
              revision: result.newRevision
            });
          }
        } catch (error) {
          console.error('Error applying transform:', error);
          socket.emit('error', { message: 'Failed to apply transform' });
        }
      });

      // Update user presence
      socket.on('update-presence', async (data: {
        sessionId: string;
        cursor?: any;
        isTyping?: boolean;
        selection?: any;
      }) => {
        try {
          const { sessionId, cursor, isTyping, selection } = data;

          await this.collaborativeService.updateUserPresence(sessionId, socket.userId, {
            cursor,
            isTyping
          });

          // Broadcast presence update to others in the session
          socket.to(sessionId).emit('presence-updated', {
            userId: socket.userId,
            username: socket.username,
            cursor,
            isTyping,
            selection,
            timestamp: Date.now()
          });
        } catch (error) {
          console.error('Error updating presence:', error);
        }
      });

      // Lock document
      socket.on('lock-document', async (data: {
        sessionId: string;
        lockType?: 'soft' | 'hard';
      }) => {
        try {
          const { sessionId, lockType = 'soft' } = data;

          const result = await this.collaborativeService.lockDocument(sessionId, socket.userId, lockType);

          if (result.success) {
            // Notify all users in the session about the lock
            this.io.to(sessionId).emit('document-locked', {
              lockedBy: socket.userId,
              lockedByName: socket.username,
              lockType,
              timestamp: Date.now()
            });

            console.log(`Document locked in session ${sessionId} by ${socket.username}`);
          } else {
            socket.emit('lock-rejected', { error: result.error });
          }
        } catch (error) {
          console.error('Error locking document:', error);
          socket.emit('error', { message: 'Failed to lock document' });
        }
      });

      // Unlock document
      socket.on('unlock-document', async (data: { sessionId: string }) => {
        try {
          const { sessionId } = data;

          const result = await this.collaborativeService.unlockDocument(sessionId, socket.userId);

          if (result.success) {
            // Notify all users in the session about the unlock
            this.io.to(sessionId).emit('document-unlocked', {
              unlockedBy: socket.userId,
              unlockedByName: socket.username,
              timestamp: Date.now()
            });

            console.log(`Document unlocked in session ${sessionId} by ${socket.username}`);
          } else {
            socket.emit('unlock-rejected', { error: result.error });
          }
        } catch (error) {
          console.error('Error unlocking document:', error);
          socket.emit('error', { message: 'Failed to unlock document' });
        }
      });

      // Create snapshot
      socket.on('create-snapshot', async (data: {
        sessionId: string;
        description?: string;
      }) => {
        try {
          const { sessionId, description } = data;

          const result = await this.collaborativeService.createSnapshot(sessionId, socket.userId, description);

          if (result.success) {
            // Notify all users in the session about the snapshot
            this.io.to(sessionId).emit('snapshot-created', {
              createdBy: socket.userId,
              createdByName: socket.username,
              versionId: result.versionId,
              description,
              timestamp: Date.now()
            });

            console.log(`Snapshot created in session ${sessionId} by ${socket.username}`);
          } else {
            socket.emit('snapshot-rejected', { error: result.error });
          }
        } catch (error) {
          console.error('Error creating snapshot:', error);
          socket.emit('error', { message: 'Failed to create snapshot' });
        }
      });

      // Handle disconnect
      socket.on('disconnect', async () => {
        console.log(`User ${socket.username} (${socket.userId}) disconnected from socket ${socket.id}`);

        // Leave all sessions
        for (const sessionId of socket.sessionIds) {
          try {
            await this.collaborativeService.leaveSession(sessionId, socket.userId);
            
            // Notify others in the session
            socket.to(sessionId).emit('user-left', {
              userId: socket.userId,
              username: socket.username
            });
          } catch (error) {
            console.error('Error leaving session on disconnect:', error);
          }
        }

        // Clean up tracking
        const userSocketSet = this.connectedUsers.get(socket.userId);
        if (userSocketSet) {
          userSocketSet.delete(socket.id);
          if (userSocketSet.size === 0) {
            this.connectedUsers.delete(socket.userId);
          }
        }
        this.userSockets.delete(socket.id);
      });

      // Send initial connected users count
      socket.emit('connected', {
        totalConnected: this.userSockets.size,
        userId: socket.userId,
        username: socket.username
      });
    });
  }

  private setupCollaborativeServiceListeners(): void {
    this.collaborativeService.on('sessionStart', (data) => {
      // Handle session start events
      const { sessionId, userId } = data;
      console.log(`Session ${sessionId} started by user ${userId}`);
    });

    this.collaborativeService.on('userJoin', (data) => {
      // Already handled in socket events
    });

    this.collaborativeService.on('userLeave', (data) => {
      // Already handled in socket events
    });

    this.collaborativeService.on('transformApplied', (data) => {
      // Already handled in socket events
    });

    this.collaborativeService.on('presenceUpdate', (data) => {
      // Already handled in socket events
    });

    this.collaborativeService.on('documentLocked', (data) => {
      // Already handled in socket events
    });

    this.collaborativeService.on('documentUnlocked', (data) => {
      // Already handled in socket events
    });

    this.collaborativeService.on('sessionCleanup', (data) => {
      const { sessionId } = data;
      
      // Notify all connected users in the session about cleanup
      this.io.to(sessionId).emit('session-cleanup', {
        sessionId,
        message: 'Session has been cleaned up due to inactivity'
      });

      console.log(`Session ${sessionId} cleaned up`);
    });
  }

  private sanitizeSession(session: any) {
    return {
      id: session.id,
      projectId: session.projectId,
      artifactType: session.artifactType,
      artifactId: session.artifactId,
      participants: session.participants.map((p: any) => ({
        userId: p.userId,
        username: p.username,
        cursor: p.cursor,
        lastSeen: p.lastSeen,
        color: p.color,
        isTyping: p.isTyping
      })),
      documentState: {
        content: session.documentState.content,
        revision: session.documentState.revision,
        lastModified: session.documentState.lastModified
      },
      isActive: session.isActive,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      lockInfo: session.lockInfo
    };
  }

  // Public methods for external access
  public getConnectedUsers(): number {
    return this.userSockets.size;
  }

  public getUserConnections(userId: string): number {
    return this.connectedUsers.get(userId)?.size || 0;
  }

  public broadcastToSession(sessionId: string, event: string, data: any): void {
    this.io.to(sessionId).emit(event, data);
  }

  public notifyUser(userId: string, event: string, data: any): void {
    const userSocketSet = this.connectedUsers.get(userId);
    if (userSocketSet) {
      for (const socketId of userSocketSet) {
        const socket = this.userSockets.get(socketId);
        if (socket) {
          socket.emit(event, data);
        }
      }
    }
  }
}

export { CollaborativeWebSocketServer };