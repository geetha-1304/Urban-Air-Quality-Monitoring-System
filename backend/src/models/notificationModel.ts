import { pool } from '../config/db';

export const createNotification = async (input: {
  userId: number; type: string; title: string; message: string; link?: string;
}) => (await pool.query(
  `INSERT INTO notifications(user_id,type,title,message,link)
   VALUES($1,$2,$3,$4,$5) RETURNING *`,
  [input.userId, input.type, input.title, input.message, input.link ?? null],
)).rows[0];

export const listNotifications = async (userId: number) => (await pool.query(
  `SELECT id,type,title,message,link,is_read,created_at
   FROM notifications WHERE user_id=$1 ORDER BY created_at DESC,id DESC LIMIT 30`,
  [userId],
)).rows;

export const unreadCount = async (userId: number) => Number((await pool.query(
  'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id=$1 AND is_read=FALSE', [userId],
)).rows[0].count);

export const markRead = async (id: number, userId: number) => (await pool.query(
  'UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2 RETURNING id', [id, userId],
)).rows[0] ?? null;

export const markAllRead = async (userId: number) => {
  await pool.query('UPDATE notifications SET is_read=TRUE WHERE user_id=$1 AND is_read=FALSE', [userId]);
};
