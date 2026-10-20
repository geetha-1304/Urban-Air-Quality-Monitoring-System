import { asyncHandler, AppError } from '../middleware/errorMiddleware';
import { AuthRequest } from '../middleware/authMiddleware';
import * as Notifications from '../models/notificationModel';

const idFromParam = (value: string) => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new AppError('Invalid notification ID', 400);
  return id;
};

export const getNotifications = asyncHandler(async (req, res) => {
  const userId = (req as AuthRequest).user!.id;
  const [notifications, unread] = await Promise.all([
    Notifications.listNotifications(userId), Notifications.unreadCount(userId),
  ]);
  res.json({ status: 'success', data: { notifications, unread } });
});

export const readNotification = asyncHandler(async (req, res) => {
  const userId = (req as AuthRequest).user!.id;
  const notification = await Notifications.markRead(idFromParam(req.params.id), userId);
  if (!notification) throw new AppError('Notification not found', 404);
  res.json({ status: 'success', data: notification });
});

export const readAllNotifications = asyncHandler(async (req, res) => {
  await Notifications.markAllRead((req as AuthRequest).user!.id);
  res.json({ status: 'success' });
});
