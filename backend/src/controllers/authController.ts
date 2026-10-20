import { Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as UserModel from '../models/userModel';
import * as Notifications from '../models/notificationModel';
import { AuthRequest } from '../middleware/authMiddleware';
import { asyncHandler, AppError } from '../middleware/errorMiddleware';

const SALT_ROUNDS = 10;

const respondWithSession = (res: Response, user: { id: number; username: string; email: string; password_hash: string; role: string; created_at: Date }) => {
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: '1d' },
  );
  const { password_hash: _omit, ...safeUser } = user;
  res.status(200).json({ status: 'success', data: { token, user: safeUser } });
};

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    throw new AppError('username, email and password are required', 400);
  }

  const existingUser = await UserModel.findUserByUsernameOrEmail(username, email);
  if (existingUser) {
    throw new AppError('Username or email is already in use', 400);
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  // Public registration always creates a regular account. Administrator roles
  // are assigned separately by a trusted operator, never from request data.
  const user = await UserModel.createUser(username, email, password_hash, 'user');
  const adminIds = await UserModel.getAdminIds();
  await Promise.all(adminIds.map((adminId) => Notifications.createNotification({
    userId: adminId,
    type: 'new_user',
    title: 'New user registered',
    message: `${user.username} joined AirWatch.`,
    link: '#users',
  }))).catch((error) => console.warn('Could not create new-user notifications:', error));

  // Never send password_hash back to the client
  const { password_hash: _omit, ...safeUser } = user;

  res.status(201).json({ status: 'success', data: safeUser });
});

export const getUsers = asyncHandler(async (_req, res) => {
  res.json({ status: 'success', data: await UserModel.getAllUsers() });
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    throw new AppError('username and password are required', 400);
  }

  const user = await UserModel.findUserByUsername(username);
  if (!user) {
    throw new AppError('Invalid username or password', 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new AppError('Invalid username or password', 401);
  }

  respondWithSession(res, user);
});

// GET /api/auth/profile (protected)
export const getProfile = asyncHandler(async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;

  const user = await UserModel.findUserById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const { password_hash: _omit, ...safeUser } = user;
  res.status(200).json({ status: 'success', data: safeUser });
});

// POST /api/auth/change-password (protected)
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new AppError('Current password and new password are required', 400);
  if (typeof newPassword !== 'string' || newPassword.length < 8) throw new AppError('New password must contain at least 8 characters', 400);

  const userId = (req as AuthRequest).user!.id;
  const user = await UserModel.findUserById(userId);
  if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
    throw new AppError('Your current password is incorrect', 401);
  }
  await UserModel.updatePassword(userId, await bcrypt.hash(newPassword, SALT_ROUNDS));
  res.json({ status: 'success', message: 'Password changed successfully' });
});

// POST /api/auth/forgot-password
// AirWatch is a local project without email delivery. The account name and registered
// email must both match before a new password is accepted.
export const resetPassword = asyncHandler(async (req, res) => {
  const { username, email, newPassword } = req.body;
  if (!username || !email || !newPassword) throw new AppError('Username, registered email, and new password are required', 400);
  if (typeof newPassword !== 'string' || newPassword.length < 8) throw new AppError('New password must contain at least 8 characters', 400);
  const user = await UserModel.findUserByUsernameOrEmail(username, email);
  if (!user || user.username !== username || user.email.toLowerCase() !== String(email).toLowerCase()) {
    throw new AppError('The username and registered email do not match an account', 404);
  }
  await UserModel.updatePassword(user.id, await bcrypt.hash(newPassword, SALT_ROUNDS));
  res.json({ status: 'success', message: 'Password reset successfully' });
});

// GET /api/auth/preferences (protected)
export const getPreferences = asyncHandler(async (req, res) => {
  const preferences = await UserModel.getPreferences((req as AuthRequest).user!.id);
  res.json({ status: 'success', data: preferences });
});

// PUT /api/auth/preferences (protected)
export const savePreferences = asyncHandler(async (req, res) => {
  const { inAppNotifications, autoRefresh } = req.body;
  if (typeof inAppNotifications !== 'boolean' || typeof autoRefresh !== 'boolean') {
    throw new AppError('Both preference values must be true or false', 400);
  }
  const preferences = await UserModel.updatePreferences((req as AuthRequest).user!.id, { inAppNotifications, autoRefresh });
  res.json({ status: 'success', data: preferences });
});
