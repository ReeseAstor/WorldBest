import { Request, Response } from 'express';
import { z } from 'zod';
import { 
  CollaborativeEditingService,
  Transform,
  UserPresence
} from '../services/collaborative-editing';
import { validateRequest } from '../middleware/validation';
import { AuthenticatedRequest } from '../types/auth';

// Validation schemas
const startSessionSchema = z.object({
  body: z.object({
    projectId: z.string().cuid(),
    artifactType: z.string().min(1),
    artifactId: z.string().min(1),
    initialContent: z.string().optional()
  })
});

const joinSessionSchema = z.object({
  params: z.object({
    sessionId: z.string().min(1)
  })
});

const applyTransformSchema = z.object({
  params: z.object({
    sessionId: z.string().min(1)
  }),
  body: z.object({
    operations: z.array(z.object({
      type: z.enum(['retain', 'insert', 'delete']),
      data: z.union([z.number(), z.string()]),
      metadata: z.record(z.any()).optional()
    })),
    baseRevision: z.number().min(0),
    metadata: z.record(z.any()).optional()
  })
});

const updatePresenceSchema = z.object({
  params: z.object({
    sessionId: z.string().min(1)
  }),
  body: z.object({
    cursor: z.object({
      position: z.number().min(0),
      selection: z.object({
        start: z.number().min(0),
        end: z.number().min(0)
      }).optional()
    }).optional(),
    isTyping: z.boolean().optional()
  })
});

const lockDocumentSchema = z.object({
  params: z.object({
    sessionId: z.string().min(1)
  }),
  body: z.object({
    lockType: z.enum(['soft', 'hard']).default('soft')
  })
});

const createSnapshotSchema = z.object({
  params: z.object({
    sessionId: z.string().min(1)
  }),
  body: z.object({
    description: z.string().optional()
  })
});

class CollaborativeEditingController {
  private collaborativeService: CollaborativeEditingService;

  constructor() {
    this.collaborativeService = new CollaborativeEditingService();
    this.setupEventListeners();
  }

  /**
   * Start a new collaborative editing session
   */
  async startSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, artifactType, artifactId, initialContent } = req.body;
      const userId = req.user.id;

      const session = await this.collaborativeService.startSession(
        projectId,
        artifactType,
        artifactId,
        userId,
        initialContent
      );

      res.status(201).json({
        success: true,
        data: {
          sessionId: session.id,
          session: this.sanitizeSession(session),
          userColor: session.participants.find(p => p.userId === userId)?.color
        },
        message: 'Collaborative session started successfully'
      });
    } catch (error) {
      console.error('Error starting collaborative session:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start session'
      });
    }
  }

  /**
   * Join an existing collaborative editing session
   */
  async joinSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      const session = await this.collaborativeService.joinSession(sessionId, userId);

      if (!session) {
        res.status(404).json({
          success: false,
          error: 'Session not found or inactive'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          session: this.sanitizeSession(session),
          userColor: session.participants.find(p => p.userId === userId)?.color
        },
        message: 'Joined session successfully'
      });
    } catch (error) {
      console.error('Error joining collaborative session:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to join session'
      });
    }
  }

  /**
   * Leave a collaborative editing session
   */
  async leaveSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      await this.collaborativeService.leaveSession(sessionId, userId);

      res.json({
        success: true,
        message: 'Left session successfully'
      });
    } catch (error) {
      console.error('Error leaving collaborative session:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to leave session'
      });
    }
  }

  /**
   * Apply operational transform to document
   */
  async applyTransform(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { operations, baseRevision, metadata = {} } = req.body;
      const userId = req.user.id;

      const result = await this.collaborativeService.applyTransform(sessionId, {
        operations,
        authorId: userId,
        baseRevision,
        metadata
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      res.json({
        success: true,
        data: {
          revision: result.newRevision,
          transformedOperations: result.transformedOps,
          conflicts: result.conflicts || []
        },
        message: 'Transform applied successfully'
      });
    } catch (error) {
      console.error('Error applying transform:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to apply transform'
      });
    }
  }

  /**
   * Get current session state
   */
  async getSessionState(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      const session = this.collaborativeService.getSessionState(sessionId);

      if (!session) {
        res.status(404).json({
          success: false,
          error: 'Session not found'
        });
        return;
      }

      res.json({
        success: true,
        data: this.sanitizeSession(session)
      });
    } catch (error) {
      console.error('Error getting session state:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get session state'
      });
    }
  }

  /**
   * Update user presence information
   */
  async updatePresence(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { cursor, isTyping } = req.body;
      const userId = req.user.id;

      await this.collaborativeService.updateUserPresence(sessionId, userId, {
        cursor,
        isTyping
      });

      res.json({
        success: true,
        message: 'Presence updated successfully'
      });
    } catch (error) {
      console.error('Error updating presence:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update presence'
      });
    }
  }

  /**
   * Lock document for exclusive editing
   */
  async lockDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { lockType } = req.body;
      const userId = req.user.id;

      const result = await this.collaborativeService.lockDocument(sessionId, userId, lockType);

      if (!result.success) {
        res.status(409).json({
          success: false,
          error: result.error
        });
        return;
      }

      res.json({
        success: true,
        message: 'Document locked successfully'
      });
    } catch (error) {
      console.error('Error locking document:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to lock document'
      });
    }
  }

  /**
   * Unlock document
   */
  async unlockDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      const result = await this.collaborativeService.unlockDocument(sessionId, userId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      res.json({
        success: true,
        message: 'Document unlocked successfully'
      });
    } catch (error) {
      console.error('Error unlocking document:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unlock document'
      });
    }
  }

  /**
   * Create a snapshot/checkpoint of current state
   */
  async createSnapshot(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { description } = req.body;
      const userId = req.user.id;

      const result = await this.collaborativeService.createSnapshot(sessionId, userId, description);

      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error
        });
        return;
      }

      res.json({
        success: true,
        data: {
          versionId: result.versionId
        },
        message: 'Snapshot created successfully'
      });
    } catch (error) {
      console.error('Error creating snapshot:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create snapshot'
      });
    }
  }

  /**
   * Get active sessions for current user
   */
  async getUserSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

      const sessions = this.collaborativeService.getUserSessions(userId);

      res.json({
        success: true,
        data: sessions.map(session => this.sanitizeSession(session))
      });
    } catch (error) {
      console.error('Error getting user sessions:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user sessions'
      });
    }
  }

  /**
   * Get document history/transforms for debugging
   */
  async getDocumentHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { limit = 50 } = req.query;

      const session = this.collaborativeService.getSessionState(sessionId);

      if (!session) {
        res.status(404).json({
          success: false,
          error: 'Session not found'
        });
        return;
      }

      const transforms = session.documentState.transforms
        .slice(-Number(limit))
        .map(transform => ({
          id: transform.id,
          authorId: transform.authorId,
          timestamp: transform.timestamp,
          baseRevision: transform.baseRevision,
          operationCount: transform.operations.length,
          metadata: transform.metadata
        }));

      res.json({
        success: true,
        data: {
          revision: session.documentState.revision,
          transforms,
          totalTransforms: session.documentState.transforms.length
        }
      });
    } catch (error) {
      console.error('Error getting document history:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get document history'
      });
    }
  }

  // Private helper methods

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

  private setupEventListeners(): void {
    this.collaborativeService.on('sessionStart', (data) => {
      // Handle session start events - could emit WebSocket events here
      console.log('Session started:', data.sessionId);
    });

    this.collaborativeService.on('userJoin', (data) => {
      // Handle user join events
      console.log('User joined session:', data.sessionId, data.userId);
    });

    this.collaborativeService.on('userLeave', (data) => {
      // Handle user leave events
      console.log('User left session:', data.sessionId, data.userId);
    });

    this.collaborativeService.on('transformApplied', (data) => {
      // Handle transform applied events
      console.log('Transform applied in session:', data.sessionId);
    });

    this.collaborativeService.on('presenceUpdate', (data) => {
      // Handle presence update events
      console.log('Presence updated in session:', data.sessionId, data.userId);
    });

    this.collaborativeService.on('documentLocked', (data) => {
      // Handle document lock events
      console.log('Document locked in session:', data.sessionId, data.userId);
    });

    this.collaborativeService.on('documentUnlocked', (data) => {
      // Handle document unlock events
      console.log('Document unlocked in session:', data.sessionId, data.userId);
    });

    this.collaborativeService.on('sessionCleanup', (data) => {
      // Handle session cleanup events
      console.log('Session cleaned up:', data.sessionId);
    });
  }
}

// Create and configure the controller
const collaborativeEditingController = new CollaborativeEditingController();

// Export individual methods with validation middleware
export const startSession = [
  validateRequest(startSessionSchema),
  collaborativeEditingController.startSession.bind(collaborativeEditingController)
];

export const joinSession = [
  validateRequest(joinSessionSchema),
  collaborativeEditingController.joinSession.bind(collaborativeEditingController)
];

export const leaveSession = [
  collaborativeEditingController.leaveSession.bind(collaborativeEditingController)
];

export const applyTransform = [
  validateRequest(applyTransformSchema),
  collaborativeEditingController.applyTransform.bind(collaborativeEditingController)
];

export const getSessionState = [
  collaborativeEditingController.getSessionState.bind(collaborativeEditingController)
];

export const updatePresence = [
  validateRequest(updatePresenceSchema),
  collaborativeEditingController.updatePresence.bind(collaborativeEditingController)
];

export const lockDocument = [
  validateRequest(lockDocumentSchema),
  collaborativeEditingController.lockDocument.bind(collaborativeEditingController)
];

export const unlockDocument = [
  collaborativeEditingController.unlockDocument.bind(collaborativeEditingController)
];

export const createSnapshot = [
  validateRequest(createSnapshotSchema),
  collaborativeEditingController.createSnapshot.bind(collaborativeEditingController)
];

export const getUserSessions = [
  collaborativeEditingController.getUserSessions.bind(collaborativeEditingController)
];

export const getDocumentHistory = [
  collaborativeEditingController.getDocumentHistory.bind(collaborativeEditingController)
];

export default collaborativeEditingController;