import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import analyticsController from '../controllers/analytics-controller';

const router = Router();
router.use(authenticateToken);

router.post('/sessions', analyticsController.startSession.bind(analyticsController));
router.put('/sessions/:sessionId', analyticsController.endSession.bind(analyticsController));
router.get('/progress/:projectId', analyticsController.getProgress.bind(analyticsController));
router.post('/backups', analyticsController.createBackup.bind(analyticsController));
router.post('/backups/:backupId/restore', analyticsController.restoreBackup.bind(analyticsController));

export default router;