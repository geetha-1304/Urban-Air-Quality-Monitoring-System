import { Router } from 'express';
import { register, login, getProfile, getUsers, changePassword, resetPassword, getPreferences, savePreferences } from '../controllers/authController';
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', resetPassword);
router.get('/profile', authMiddleware, getProfile);
router.get('/users', authMiddleware, requireAdmin, getUsers);
router.post('/change-password', authMiddleware, changePassword);
router.get('/preferences', authMiddleware, getPreferences);
router.put('/preferences', authMiddleware, savePreferences);

export default router;
