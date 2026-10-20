import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { getNotifications, readAllNotifications, readNotification } from '../controllers/notificationController';

const router = Router();
router.use(authMiddleware);
router.get('/', getNotifications);
router.patch('/read-all', readAllNotifications);
router.patch('/:id/read', readNotification);
export default router;
