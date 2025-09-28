import { Router } from 'express';
import { healthController } from '../controllers/health';

const router = Router();

router.get('/', healthController.getHealth);
router.get('/ready', healthController.getReadiness);
router.get('/live', healthController.getLiveness);

export { router as healthRoutes };