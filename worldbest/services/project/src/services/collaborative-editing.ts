import { PrismaClient } from '@worldbest/database';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { VersionControlService } from './version-control';

// Operational Transform (OT) operations
interface Operation {
  type: 'retain' | 'insert' | 'delete';
  data: number | string;
  metadata?: Record<string, any>;
}

interface Transform {
  id: string;
  operations: Operation[];
  authorId: string;
  timestamp: number;
  baseRevision: number;
  metadata: Record<string, any>;
}

interface DocumentState {
  content: string;
  revision: number;
  lastModified: Date;
  transforms: Transform[];
}

interface UserPresence {
  userId: string;
  username: string;
  cursor: {
    position: number;
    selection?: { start: number; end: number };
  };
  lastSeen: Date;
  color: string;
  isTyping: boolean;
}

interface ConflictResolution {
  strategy: 'auto' | 'manual' | 'latest-wins' | 'merge';
  resolvedBy?: string;
  timestamp: Date;
  originalTransforms: Transform[];
  resolvedTransform: Transform;
}

interface CollaborativeSession {
  id: string;
  projectId: string;
  artifactType: string;
  artifactId: string;
  participants: UserPresence[];
  documentState: DocumentState;
  isActive: boolean;
  createdAt: Date;
  lastActivity: Date;
  lockInfo?: {
    lockedBy: string;
    lockedAt: Date;
    lockType: 'soft' | 'hard';
  };
}

class CollaborativeEditingService extends EventEmitter {
  private prisma: PrismaClient;
  private versionService: VersionControlService;
  private activeSessions: Map<string, CollaborativeSession>;
  private userSessions: Map<string, Set<string>>; // userId -> sessionIds
  private conflictResolver: ConflictResolver;

  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.versionService = new VersionControlService();
    this.activeSessions = new Map();
    this.userSessions = new Map();
    this.conflictResolver = new ConflictResolver();

    // Clean up inactive sessions every 5 minutes
    setInterval(() => this.cleanupInactiveSessions(), 5 * 60 * 1000);
  }

  /**
   * Start a collaborative editing session
   */
  async startSession(
    projectId: string,
    artifactType: string,
    artifactId: string,
    userId: string,
    initialContent?: string
  ): Promise<CollaborativeSession> {
    const sessionId = `${projectId}:${artifactType}:${artifactId}`;

    // Check if session already exists
    let session = this.activeSessions.get(sessionId);
    
    if (!session) {
      // Get latest content from version control or use provided content
      let content = initialContent || '';
      if (!initialContent) {
        try {
          const latestVersion = await this.versionService.getVersionHistory(
            projectId,
            artifactType,
            artifactId,
            { limit: 1 }
          );
          
          if (latestVersion.versions.length > 0) {
            content = await this.versionService.reconstructContent(latestVersion.versions[0].id);
            content = JSON.parse(content);
          }
        } catch (error) {
          console.error('Error getting latest content:', error);
        }
      }

      session = {
        id: sessionId,
        projectId,
        artifactType,
        artifactId,
        participants: [],
        documentState: {
          content: typeof content === 'string' ? content : JSON.stringify(content),
          revision: 0,
          lastModified: new Date(),
          transforms: []
        },
        isActive: true,
        createdAt: new Date(),
        lastActivity: new Date()
      };

      this.activeSessions.set(sessionId, session);
    }

    // Add user to session if not already present
    if (!session.participants.find(p => p.userId === userId)) {
      const userPresence: UserPresence = {
        userId,
        username: await this.getUserName(userId),
        cursor: { position: 0 },
        lastSeen: new Date(),
        color: this.generateUserColor(userId),
        isTyping: false
      };

      session.participants.push(userPresence);
      
      // Track user sessions
      if (!this.userSessions.has(userId)) {
        this.userSessions.set(userId, new Set());
      }
      this.userSessions.get(userId)!.add(sessionId);
    }

    session.lastActivity = new Date();

    // Emit session start event
    this.emit('sessionStart', { sessionId, userId, session });

    return session;
  }

  /**
   * Join an existing collaborative session
   */
  async joinSession(sessionId: string, userId: string): Promise<CollaborativeSession | null> {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || !session.isActive) {
      return null;
    }

    // Add user if not already in session
    if (!session.participants.find(p => p.userId === userId)) {
      const userPresence: UserPresence = {
        userId,
        username: await this.getUserName(userId),
        cursor: { position: 0 },
        lastSeen: new Date(),
        color: this.generateUserColor(userId),
        isTyping: false
      };

      session.participants.push(userPresence);

      // Track user sessions
      if (!this.userSessions.has(userId)) {
        this.userSessions.set(userId, new Set());
      }
      this.userSessions.get(userId)!.add(sessionId);
    }

    session.lastActivity = new Date();

    // Emit user join event
    this.emit('userJoin', { sessionId, userId, session });

    return session;
  }

  /**
   * Leave a collaborative session
   */
  async leaveSession(sessionId: string, userId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      return;
    }

    // Remove user from session
    session.participants = session.participants.filter(p => p.userId !== userId);

    // Remove from user sessions tracking
    const userSessionSet = this.userSessions.get(userId);
    if (userSessionSet) {
      userSessionSet.delete(sessionId);
      if (userSessionSet.size === 0) {
        this.userSessions.delete(userId);
      }
    }

    // If no participants left, deactivate session
    if (session.participants.length === 0) {
      session.isActive = false;
      
      // Save final state to version control
      await this.saveSessionToVersionControl(session, userId);
      
      // Clean up session after delay
      setTimeout(() => {
        this.activeSessions.delete(sessionId);
      }, 30000); // 30 seconds delay
    }

    session.lastActivity = new Date();

    // Emit user leave event
    this.emit('userLeave', { sessionId, userId, session });
  }

  /**
   * Apply operational transform to document
   */
  async applyTransform(
    sessionId: string,
    transform: Omit<Transform, 'id' | 'timestamp'>
  ): Promise<{
    success: boolean;
    transformedOps?: Operation[];
    conflicts?: any[];
    newRevision: number;
    error?: string;
  }> {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || !session.isActive) {
      return { success: false, error: 'Session not found or inactive', newRevision: 0 };
    }

    try {
      // Create full transform with metadata
      const fullTransform: Transform = {
        id: uuidv4(),
        timestamp: Date.now(),
        ...transform
      };

      // Check for conflicts with concurrent transforms
      const concurrentTransforms = session.documentState.transforms.filter(
        t => t.baseRevision === transform.baseRevision && t.authorId !== transform.authorId
      );

      let transformedOps = fullTransform.operations;
      const conflicts: any[] = [];

      // Apply operational transform algorithm for concurrent operations
      if (concurrentTransforms.length > 0) {
        const result = await this.conflictResolver.resolveConflicts(
          fullTransform,
          concurrentTransforms,
          session.documentState.content
        );

        transformedOps = result.resolvedOperations;
        conflicts.push(...result.conflicts);
      }

      // Apply operations to document content
      const newContent = this.applyOperations(session.documentState.content, transformedOps);

      // Update document state
      session.documentState.content = newContent;
      session.documentState.revision++;
      session.documentState.lastModified = new Date();
      session.documentState.transforms.push({
        ...fullTransform,
        operations: transformedOps
      });

      // Keep only recent transforms (last 100)
      if (session.documentState.transforms.length > 100) {
        session.documentState.transforms = session.documentState.transforms.slice(-100);
      }

      session.lastActivity = new Date();

      // Emit transform applied event
      this.emit('transformApplied', {
        sessionId,
        transform: fullTransform,
        newContent,
        revision: session.documentState.revision,
        conflicts
      });

      return {
        success: true,
        transformedOps,
        conflicts,
        newRevision: session.documentState.revision
      };
    } catch (error) {
      console.error('Error applying transform:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        newRevision: session.documentState.revision
      };
    }
  }

  /**
   * Update user cursor position and presence
   */
  async updateUserPresence(
    sessionId: string,
    userId: string,
    presence: Partial<UserPresence>
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      return;
    }

    const userPresence = session.participants.find(p => p.userId === userId);
    
    if (userPresence) {
      Object.assign(userPresence, presence, { lastSeen: new Date() });
      session.lastActivity = new Date();

      // Emit presence update event
      this.emit('presenceUpdate', { sessionId, userId, presence: userPresence });
    }
  }

  /**
   * Get current session state
   */
  getSessionState(sessionId: string): CollaborativeSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Get all active sessions for a user
   */
  getUserSessions(userId: string): CollaborativeSession[] {
    const sessionIds = this.userSessions.get(userId);
    
    if (!sessionIds) {
      return [];
    }

    return Array.from(sessionIds)
      .map(id => this.activeSessions.get(id))
      .filter(session => session && session.isActive) as CollaborativeSession[];
  }

  /**
   * Lock document for exclusive editing
   */
  async lockDocument(
    sessionId: string,
    userId: string,
    lockType: 'soft' | 'hard' = 'soft'
  ): Promise<{ success: boolean; error?: string }> {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    if (session.lockInfo && session.lockInfo.lockedBy !== userId) {
      return { success: false, error: 'Document is already locked by another user' };
    }

    session.lockInfo = {
      lockedBy: userId,
      lockedAt: new Date(),
      lockType
    };

    // Emit lock event
    this.emit('documentLocked', { sessionId, userId, lockType });

    return { success: true };
  }

  /**
   * Unlock document
   */
  async unlockDocument(sessionId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    if (!session.lockInfo) {
      return { success: true }; // Already unlocked
    }

    if (session.lockInfo.lockedBy !== userId) {
      return { success: false, error: 'Document is locked by another user' };
    }

    delete session.lockInfo;

    // Emit unlock event
    this.emit('documentUnlocked', { sessionId, userId });

    return { success: true };
  }

  /**
   * Create a snapshot/checkpoint of current state
   */
  async createSnapshot(
    sessionId: string,
    userId: string,
    description?: string
  ): Promise<{ success: boolean; versionId?: string; error?: string }> {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    try {
      const versionId = await this.versionService.createVersion({
        projectId: session.projectId,
        artifactType: session.artifactType,
        artifactId: session.artifactId,
        content: session.documentState.content,
        userId,
        description: description || 'Collaborative editing snapshot',
        tags: ['collaborative', 'snapshot']
      });

      return { success: true, versionId: versionId.id };
    } catch (error) {
      console.error('Error creating snapshot:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create snapshot'
      };
    }
  }

  // Private helper methods

  private applyOperations(content: string, operations: Operation[]): string {
    let result = content;
    let offset = 0;

    for (const op of operations) {
      switch (op.type) {
        case 'retain':
          offset += op.data as number;
          break;
        case 'insert':
          result = result.slice(0, offset) + (op.data as string) + result.slice(offset);
          offset += (op.data as string).length;
          break;
        case 'delete':
          const deleteLength = op.data as number;
          result = result.slice(0, offset) + result.slice(offset + deleteLength);
          break;
      }
    }

    return result;
  }

  private async saveSessionToVersionControl(session: CollaborativeSession, userId: string): Promise<void> {
    try {
      await this.versionService.createVersion({
        projectId: session.projectId,
        artifactType: session.artifactType,
        artifactId: session.artifactId,
        content: session.documentState.content,
        userId,
        description: 'Auto-save from collaborative session',
        tags: ['collaborative', 'auto-save']
      });
    } catch (error) {
      console.error('Error saving session to version control:', error);
    }
  }

  private async getUserName(userId: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, email: true }
      });
      
      return user?.username || user?.email || 'Unknown User';
    } catch {
      return 'Unknown User';
    }
  }

  private generateUserColor(userId: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
      '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'
    ];
    
    const hash = userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  }

  private cleanupInactiveSessions(): void {
    const now = new Date();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

    for (const [sessionId, session] of this.activeSessions.entries()) {
      const timeSinceLastActivity = now.getTime() - session.lastActivity.getTime();
      
      if (timeSinceLastActivity > inactiveThreshold) {
        session.isActive = false;
        this.activeSessions.delete(sessionId);
        
        // Clean up user session tracking
        for (const participant of session.participants) {
          const userSessionSet = this.userSessions.get(participant.userId);
          if (userSessionSet) {
            userSessionSet.delete(sessionId);
            if (userSessionSet.size === 0) {
              this.userSessions.delete(participant.userId);
            }
          }
        }

        this.emit('sessionCleanup', { sessionId, session });
      }
    }
  }
}

// Conflict resolution algorithms
class ConflictResolver {
  async resolveConflicts(
    newTransform: Transform,
    concurrentTransforms: Transform[],
    currentContent: string
  ): Promise<{
    resolvedOperations: Operation[];
    conflicts: any[];
  }> {
    // Simple conflict resolution - in a real implementation, this would be much more sophisticated
    // For now, we'll use a basic "transform against all concurrent operations" approach
    
    let resolvedOps = [...newTransform.operations];
    const conflicts: any[] = [];

    for (const concurrentTransform of concurrentTransforms) {
      const result = this.transformAgainst(resolvedOps, concurrentTransform.operations);
      resolvedOps = result.transformedOps;
      
      if (result.hasConflict) {
        conflicts.push({
          type: 'operational',
          newTransform: newTransform.id,
          conflictingTransform: concurrentTransform.id,
          resolution: 'auto-transformed'
        });
      }
    }

    return { resolvedOperations: resolvedOps, conflicts };
  }

  private transformAgainst(
    ops1: Operation[],
    ops2: Operation[]
  ): { transformedOps: Operation[]; hasConflict: boolean } {
    // Basic operational transform implementation
    // This is a simplified version - real OT is much more complex
    
    let hasConflict = false;
    const transformedOps = [...ops1];

    // Check for overlapping operations
    for (let i = 0; i < ops1.length; i++) {
      for (let j = 0; j < ops2.length; j++) {
        if (this.operationsOverlap(ops1[i], ops2[j])) {
          hasConflict = true;
          // Apply transformation rules here
          // For simplicity, we'll just mark the conflict
        }
      }
    }

    return { transformedOps, hasConflict };
  }

  private operationsOverlap(op1: Operation, op2: Operation): boolean {
    // Simplified overlap detection
    // Real implementation would need to track positions and ranges
    return op1.type !== 'retain' && op2.type !== 'retain';
  }
}

export {
  CollaborativeEditingService,
  CollaborativeSession,
  Transform,
  Operation,
  UserPresence,
  ConflictResolution
};