import { 
  Document, 
  Operation, 
  OperationResult, 
  Collaborator, 
  CollaboratorRole,
  CollaboratorPermissions,
  UserPresence,
  Comment,
  Suggestion,
  CollaborationSession,
  DocumentLock,
  LockType,
  ConflictType
} from '../types/collaboration.types.js';
import { OperationalTransform } from './operational-transform.service.js';
import { v4 as uuidv4 } from 'uuid';

export class CollaborationService {
  private documents: Map<string, Document> = new Map();
  private operations: Map<string, Operation[]> = new Map();
  private sessions: Map<string, CollaborationSession> = new Map();
  private presence: Map<string, UserPresence> = new Map();
  private comments: Map<string, Comment[]> = new Map();
  private suggestions: Map<string, Suggestion[]> = new Map();
  private locks: Map<string, DocumentLock[]> = new Map();
  
  /**
   * Initialize a new collaborative document
   */
  async createDocument(
    projectId: string,
    title: string,
    content: string,
    createdBy: string
  ): Promise<Document> {
    const document: Document = {
      id: uuidv4(),
      projectId,
      title,
      content,
      version: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
      lastModifiedBy: createdBy,
      collaborators: [{
        userId: createdBy,
        username: 'Document Creator',
        email: '',
        role: CollaboratorRole.OWNER,
        permissions: this.getOwnerPermissions(),
        joinedAt: new Date(),
        lastActive: new Date(),
        isOnline: true,
        color: this.generateUserColor(createdBy)
      }],
      permissions: {
        isPublic: false,
        allowComments: true,
        allowSuggestions: true,
        requireApproval: false,
        canInviteOthers: true
      }
    };

    this.documents.set(document.id, document);
    this.operations.set(document.id, []);
    this.comments.set(document.id, []);
    this.suggestions.set(document.id, []);
    this.locks.set(document.id, []);

    return document;
  }

  /**
   * Get document by ID
   */
  async getDocument(documentId: string): Promise<Document | null> {
    return this.documents.get(documentId) || null;
  }

  /**
   * Apply an operation to a document
   */
  async applyOperation(operation: Operation): Promise<OperationResult> {
    const document = this.documents.get(operation.documentId);
    if (!document) {
      return {
        success: false,
        newVersion: 0,
        transformedOperations: [],
        error: 'Document not found'
      };
    }

    // Check permissions
    const collaborator = document.collaborators.find(c => c.userId === operation.userId);
    if (!collaborator?.permissions.canEdit) {
      return {
        success: false,
        newVersion: document.version,
        transformedOperations: [],
        error: 'Insufficient permissions'
      };
    }

    // Check for locks
    const isLocked = this.isPositionLocked(operation.documentId, operation.position, operation.userId);
    if (isLocked) {
      return {
        success: false,
        newVersion: document.version,
        transformedOperations: [],
        conflicts: [{
          operationId: operation.id,
          conflictType: ConflictType.CONTENT_LOCKED,
          description: 'The content area is locked by another user'
        }],
        error: 'Content is locked'
      };
    }

    // Get concurrent operations since this operation's version
    const documentOps = this.operations.get(operation.documentId) || [];
    const concurrentOps = documentOps.filter(op => 
      op.version >= operation.version && op.clientId !== operation.clientId
    );

    let transformedOp = operation;
    const transformedOperations = [operation];

    // Transform against concurrent operations
    if (concurrentOps.length > 0) {
      const transformResult = OperationalTransform.transformAgainstOperations(
        operation, 
        concurrentOps
      );
      transformedOp = transformResult.operation;
      transformedOperations[0] = transformedOp;
    }

    // Validate operation
    if (!OperationalTransform.validateOperation(transformedOp, document.content.length)) {
      return {
        success: false,
        newVersion: document.version,
        transformedOperations: [],
        error: 'Invalid operation'
      };
    }

    // Apply operation to document
    try {
      const newContent = OperationalTransform.applyOperation(document.content, transformedOp);
      
      // Update document
      document.content = newContent;
      document.version += 1;
      document.updatedAt = new Date();
      document.lastModifiedBy = operation.userId;

      // Set operation version to the new document version
      transformedOp.version = document.version;

      // Store operation
      documentOps.push(transformedOp);
      this.operations.set(operation.documentId, documentOps);

      // Update collaborator activity
      const activeCollaborator = document.collaborators.find(c => c.userId === operation.userId);
      if (activeCollaborator) {
        activeCollaborator.lastActive = new Date();
      }

      return {
        success: true,
        newVersion: document.version,
        transformedOperations
      };

    } catch (error) {
      return {
        success: false,
        newVersion: document.version,
        transformedOperations: [],
        error: error instanceof Error ? error.message : 'Failed to apply operation'
      };
    }
  }

  /**
   * Add a collaborator to a document
   */
  async addCollaborator(
    documentId: string,
    userId: string,
    username: string,
    email: string,
    role: CollaboratorRole,
    invitedBy: string
  ): Promise<boolean> {
    const document = this.documents.get(documentId);
    if (!document) return false;

    // Check if inviter has permission
    const inviter = document.collaborators.find(c => c.userId === invitedBy);
    if (!inviter?.permissions.canShare) return false;

    // Check if user is already a collaborator
    const existingCollaborator = document.collaborators.find(c => c.userId === userId);
    if (existingCollaborator) return false;

    const collaborator: Collaborator = {
      userId,
      username,
      email,
      role,
      permissions: this.getPermissionsForRole(role),
      joinedAt: new Date(),
      lastActive: new Date(),
      isOnline: false,
      color: this.generateUserColor(userId)
    };

    document.collaborators.push(collaborator);
    document.updatedAt = new Date();

    return true;
  }

  /**
   * Remove a collaborator from a document
   */
  async removeCollaborator(
    documentId: string,
    userId: string,
    removedBy: string
  ): Promise<boolean> {
    const document = this.documents.get(documentId);
    if (!document) return false;

    // Check permissions
    const remover = document.collaborators.find(c => c.userId === removedBy);
    if (!remover?.permissions.canManagePermissions) return false;

    // Cannot remove owner
    const toRemove = document.collaborators.find(c => c.userId === userId);
    if (toRemove?.role === CollaboratorRole.OWNER) return false;

    // Remove collaborator
    document.collaborators = document.collaborators.filter(c => c.userId !== userId);
    document.updatedAt = new Date();

    // Remove user's presence
    const presenceKey = `${documentId}:${userId}`;
    this.presence.delete(presenceKey);

    return true;
  }

  /**
   * Join a collaborative session
   */
  async joinSession(
    documentId: string,
    userId: string,
    socketId: string
  ): Promise<CollaborationSession | null> {
    const document = this.documents.get(documentId);
    if (!document) return null;

    const collaborator = document.collaborators.find(c => c.userId === userId);
    if (!collaborator) return null;

    const session: CollaborationSession = {
      id: uuidv4(),
      documentId,
      userId,
      socketId,
      joinedAt: new Date(),
      lastActivity: new Date(),
      permissions: collaborator.permissions
    };

    this.sessions.set(session.id, session);

    // Update collaborator status
    collaborator.isOnline = true;
    collaborator.lastActive = new Date();

    return session;
  }

  /**
   * Leave a collaborative session
   */
  async leaveSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const document = this.documents.get(session.documentId);
    if (document) {
      const collaborator = document.collaborators.find(c => c.userId === session.userId);
      if (collaborator) {
        collaborator.isOnline = false;
        collaborator.lastActive = new Date();
      }
    }

    // Remove presence
    const presenceKey = `${session.documentId}:${session.userId}`;
    this.presence.delete(presenceKey);

    // Remove session
    this.sessions.delete(sessionId);

    return true;
  }

  /**
   * Update user presence (cursor, selection, typing status)
   */
  async updatePresence(
    documentId: string,
    userId: string,
    presence: Partial<UserPresence>
  ): Promise<void> {
    const presenceKey = `${documentId}:${userId}`;
    const existing = this.presence.get(presenceKey);

    const updated: UserPresence = {
      userId,
      username: presence.username || existing?.username || '',
      documentId,
      cursor: presence.cursor || existing?.cursor,
      selection: presence.selection || existing?.selection,
      isTyping: presence.isTyping ?? existing?.isTyping ?? false,
      lastSeen: new Date(),
      color: existing?.color || this.generateUserColor(userId),
      metadata: { ...existing?.metadata, ...presence.metadata }
    };

    this.presence.set(presenceKey, updated);
  }

  /**
   * Get all active users for a document
   */
  async getActiveUsers(documentId: string): Promise<UserPresence[]> {
    const activeUsers: UserPresence[] = [];
    
    for (const [key, presence] of this.presence.entries()) {
      if (key.startsWith(`${documentId}:`)) {
        // Consider users active if they were seen in the last 30 seconds
        const thirtySecondsAgo = new Date(Date.now() - 30000);
        if (presence.lastSeen > thirtySecondsAgo) {
          activeUsers.push(presence);
        }
      }
    }

    return activeUsers;
  }

  /**
   * Add a comment to a document
   */
  async addComment(
    documentId: string,
    userId: string,
    username: string,
    content: string,
    position: { start: number; end: number; selectedText?: string }
  ): Promise<Comment> {
    const comment: Comment = {
      id: uuidv4(),
      documentId,
      userId,
      username,
      content,
      position,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      reactions: []
    };

    const documentComments = this.comments.get(documentId) || [];
    documentComments.push(comment);
    this.comments.set(documentId, documentComments);

    return comment;
  }

  /**
   * Resolve a comment
   */
  async resolveComment(
    documentId: string,
    commentId: string,
    resolvedBy: string
  ): Promise<boolean> {
    const documentComments = this.comments.get(documentId) || [];
    const comment = documentComments.find(c => c.id === commentId);
    
    if (!comment) return false;

    comment.status = 'resolved';
    comment.resolvedAt = new Date();
    comment.resolvedBy = resolvedBy;
    comment.updatedAt = new Date();

    return true;
  }

  /**
   * Get comments for a document
   */
  async getComments(documentId: string): Promise<Comment[]> {
    return this.comments.get(documentId) || [];
  }

  /**
   * Add a suggestion to a document
   */
  async addSuggestion(
    documentId: string,
    userId: string,
    username: string,
    type: 'insertion' | 'deletion' | 'replacement' | 'formatting',
    position: { start: number; end: number },
    originalText: string,
    suggestedText: string,
    description?: string
  ): Promise<Suggestion> {
    const suggestion: Suggestion = {
      id: uuidv4(),
      documentId,
      userId,
      username,
      type,
      position,
      originalText,
      suggestedText,
      description,
      status: 'pending',
      createdAt: new Date()
    };

    const documentSuggestions = this.suggestions.get(documentId) || [];
    documentSuggestions.push(suggestion);
    this.suggestions.set(documentId, documentSuggestions);

    return suggestion;
  }

  /**
   * Review a suggestion (accept/reject)
   */
  async reviewSuggestion(
    documentId: string,
    suggestionId: string,
    reviewedBy: string,
    status: 'accepted' | 'rejected',
    reviewComment?: string
  ): Promise<boolean> {
    const documentSuggestions = this.suggestions.get(documentId) || [];
    const suggestion = documentSuggestions.find(s => s.id === suggestionId);
    
    if (!suggestion) return false;

    suggestion.status = status;
    suggestion.reviewedAt = new Date();
    suggestion.reviewedBy = reviewedBy;
    suggestion.reviewComment = reviewComment;

    // If accepted, apply the suggestion as an operation
    if (status === 'accepted') {
      // This would create and apply an operation based on the suggestion
      // Implementation depends on specific requirements
    }

    return true;
  }

  /**
   * Get suggestions for a document
   */
  async getSuggestions(documentId: string): Promise<Suggestion[]> {
    return this.suggestions.get(documentId) || [];
  }

  /**
   * Lock a document or section
   */
  async lockDocument(
    documentId: string,
    userId: string,
    lockType: LockType,
    position?: { start: number; end: number },
    duration: number = 300000 // 5 minutes default
  ): Promise<DocumentLock> {
    const lock: DocumentLock = {
      id: uuidv4(),
      documentId,
      userId,
      lockType,
      position,
      expiresAt: new Date(Date.now() + duration),
      createdAt: new Date()
    };

    const documentLocks = this.locks.get(documentId) || [];
    documentLocks.push(lock);
    this.locks.set(documentId, documentLocks);

    return lock;
  }

  /**
   * Release a lock
   */
  async releaseLock(documentId: string, lockId: string, userId: string): Promise<boolean> {
    const documentLocks = this.locks.get(documentId) || [];
    const lockIndex = documentLocks.findIndex(l => l.id === lockId && l.userId === userId);
    
    if (lockIndex === -1) return false;

    documentLocks.splice(lockIndex, 1);
    this.locks.set(documentId, documentLocks);

    return true;
  }

  /**
   * Check if a position is locked
   */
  private isPositionLocked(documentId: string, position: number, userId: string): boolean {
    const documentLocks = this.locks.get(documentId) || [];
    const now = new Date();

    for (const lock of documentLocks) {
      // Skip expired locks
      if (lock.expiresAt < now) continue;
      
      // Skip own locks
      if (lock.userId === userId) continue;

      if (lock.lockType === LockType.FULL_DOCUMENT) {
        return true;
      }

      if (lock.lockType === LockType.SELECTION && lock.position) {
        if (position >= lock.position.start && position <= lock.position.end) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get permissions for a role
   */
  private getPermissionsForRole(role: CollaboratorRole): CollaboratorPermissions {
    switch (role) {
      case CollaboratorRole.OWNER:
        return this.getOwnerPermissions();
      case CollaboratorRole.EDITOR:
        return {
          canEdit: true,
          canComment: true,
          canSuggest: true,
          canShare: true,
          canDelete: false,
          canManagePermissions: false
        };
      case CollaboratorRole.REVIEWER:
        return {
          canEdit: false,
          canComment: true,
          canSuggest: true,
          canShare: false,
          canDelete: false,
          canManagePermissions: false
        };
      case CollaboratorRole.VIEWER:
        return {
          canEdit: false,
          canComment: true,
          canSuggest: false,
          canShare: false,
          canDelete: false,
          canManagePermissions: false
        };
      default:
        return {
          canEdit: false,
          canComment: false,
          canSuggest: false,
          canShare: false,
          canDelete: false,
          canManagePermissions: false
        };
    }
  }

  private getOwnerPermissions(): CollaboratorPermissions {
    return {
      canEdit: true,
      canComment: true,
      canSuggest: true,
      canShare: true,
      canDelete: true,
      canManagePermissions: true
    };
  }

  /**
   * Generate a consistent color for a user
   */
  private generateUserColor(userId: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Clean up expired locks
   */
  async cleanupExpiredLocks(): Promise<void> {
    const now = new Date();
    
    for (const [documentId, locks] of this.locks.entries()) {
      const activeLocks = locks.filter(lock => lock.expiresAt > now);
      this.locks.set(documentId, activeLocks);
    }
  }

  /**
   * Get document statistics
   */
  async getDocumentStats(documentId: string): Promise<any> {
    const document = this.documents.get(documentId);
    if (!document) return null;

    const operations = this.operations.get(documentId) || [];
    const comments = this.comments.get(documentId) || [];
    const suggestions = this.suggestions.get(documentId) || [];
    const activeUsers = await this.getActiveUsers(documentId);

    return {
      documentId,
      version: document.version,
      collaborators: document.collaborators.length,
      activeUsers: activeUsers.length,
      totalOperations: operations.length,
      totalComments: comments.length,
      activeComments: comments.filter(c => c.status === 'active').length,
      totalSuggestions: suggestions.length,
      pendingSuggestions: suggestions.filter(s => s.status === 'pending').length,
      lastModified: document.updatedAt,
      wordCount: document.content.split(/\s+/).filter(word => word.length > 0).length
    };
  }
}