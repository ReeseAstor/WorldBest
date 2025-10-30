import { Router } from 'express';
import { body } from 'express-validator';
import { UserController } from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();
const userController = new UserController();

// User profile routes
router.get('/profile', authenticate, userController.getProfile);
router.put('/profile', authenticate, [
  body('displayName').optional().isLength({ min: 2, max: 50 }),
  body('bio').optional().isLength({ max: 500 }),
  body('avatar').optional().isURL(),
], validateRequest, userController.updateProfile);

// User preferences
router.get('/preferences', authenticate, userController.getPreferences);
router.put('/preferences', authenticate, userController.updatePreferences);

// User subscription
router.get('/subscription', authenticate, userController.getSubscription);
router.post('/subscription/upgrade', authenticate, userController.upgradeSubscription);
router.post('/subscription/cancel', authenticate, userController.cancelSubscription);

// Admin routes
router.get('/', authenticate, authorize('admin'), userController.listUsers);
router.get('/:id', authenticate, authorize('admin'), userController.getUser);
router.put('/:id', authenticate, authorize('admin'), userController.updateUser);
router.delete('/:id', authenticate, authorize('admin'), userController.deleteUser);
router.post('/:id/suspend', authenticate, authorize('admin'), userController.suspendUser);
router.post('/:id/activate', authenticate, authorize('admin'), userController.activateUser);

export { router as userRouter };