import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { checkProjectAccess } from '../middleware/project-access';
import {
  startSession,
  joinSession,
  leaveSession,
  applyTransform,
  getSessionState,
  updatePresence,
  lockDocument,
  unlockDocument,
  createSnapshot,
  getUserSessions,
  getDocumentHistory
} from '../controllers/collaborative-editing';

const router = Router();

// All collaborative editing routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/collaborative/session
 * @desc    Start a new collaborative editing session
 * @access  Private
 * @body    {projectId, artifactType, artifactId, initialContent?}
 */
router.post('/session', startSession);

/**
 * @route   POST /api/collaborative/session/:sessionId/join
 * @desc    Join an existing collaborative editing session
 * @access  Private
 * @params  sessionId - Session ID
 */
router.post('/session/:sessionId/join', joinSession);

/**
 * @route   POST /api/collaborative/session/:sessionId/leave
 * @desc    Leave a collaborative editing session
 * @access  Private
 * @params  sessionId - Session ID
 */
router.post('/session/:sessionId/leave', leaveSession);

/**
 * @route   GET /api/collaborative/session/:sessionId
 * @desc    Get current session state
 * @access  Private
 * @params  sessionId - Session ID
 */
router.get('/session/:sessionId', getSessionState);

/**
 * @route   POST /api/collaborative/session/:sessionId/transform
 * @desc    Apply operational transform to document
 * @access  Private
 * @params  sessionId - Session ID
 * @body    {operations, baseRevision, metadata?}
 */
router.post('/session/:sessionId/transform', applyTransform);

/**
 * @route   POST /api/collaborative/session/:sessionId/presence
 * @desc    Update user presence information
 * @access  Private
 * @params  sessionId - Session ID
 * @body    {cursor?, isTyping?}
 */
router.post('/session/:sessionId/presence', updatePresence);

/**
 * @route   POST /api/collaborative/session/:sessionId/lock
 * @desc    Lock document for exclusive editing
 * @access  Private
 * @params  sessionId - Session ID
 * @body    {lockType?: 'soft' | 'hard'}
 */
router.post('/session/:sessionId/lock', lockDocument);

/**
 * @route   POST /api/collaborative/session/:sessionId/unlock
 * @desc    Unlock document
 * @access  Private
 * @params  sessionId - Session ID
 */
router.post('/session/:sessionId/unlock', unlockDocument);

/**
 * @route   POST /api/collaborative/session/:sessionId/snapshot
 * @desc    Create a snapshot/checkpoint of current state
 * @access  Private
 * @params  sessionId - Session ID
 * @body    {description?}
 */
router.post('/session/:sessionId/snapshot', createSnapshot);

/**
 * @route   GET /api/collaborative/session/:sessionId/history
 * @desc    Get document history/transforms for debugging
 * @access  Private
 * @params  sessionId - Session ID
 * @query   limit? - Number of transforms to return (default: 50)
 */
router.get('/session/:sessionId/history', getDocumentHistory);

/**
 * @route   GET /api/collaborative/sessions
 * @desc    Get active sessions for current user
 * @access  Private
 */
router.get('/sessions', getUserSessions);

export default router;