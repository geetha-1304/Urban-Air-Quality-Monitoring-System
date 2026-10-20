import { pool } from '../config/db';
import bcrypt from 'bcrypt';
import { User } from '../types';
export const findUserByUsernameOrEmail = async (username:string,email:string):Promise<User|null> => (await pool.query('SELECT * FROM users WHERE username=$1 OR email=$2',[username,email])).rows[0]||null;
export const findUserByUsername = async (username:string):Promise<User|null> => (await pool.query('SELECT * FROM users WHERE username=$1',[username])).rows[0]||null;
export const findUserById = async (id:number):Promise<User|null> => (await pool.query('SELECT * FROM users WHERE id=$1',[id])).rows[0]||null;
export const createUser = async (username:string,email:string,password_hash:string,role:string):Promise<User> => (await pool.query('INSERT INTO users(username,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING *',[username,email,password_hash,role])).rows[0];
export const getAllUsers = async () => (await pool.query('SELECT id,username,email,role,created_at FROM users ORDER BY created_at DESC, id DESC')).rows;
export const getAdminIds = async (): Promise<number[]> => (await pool.query<{ id: number }>("SELECT id FROM users WHERE role='admin'")).rows.map((row) => row.id);

export const updatePassword = async (id: number, passwordHash: string): Promise<void> => {
  await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [passwordHash, id]);
};

export const getPreferences = async (id: number) => {
  await pool.query('INSERT INTO user_preferences(user_id) VALUES($1) ON CONFLICT (user_id) DO NOTHING', [id]);
  return (await pool.query(
    'SELECT in_app_notifications, auto_refresh FROM user_preferences WHERE user_id=$1', [id],
  )).rows[0];
};

export const updatePreferences = async (id: number, input: { inAppNotifications: boolean; autoRefresh: boolean }) => (
  await pool.query(
    `INSERT INTO user_preferences(user_id, in_app_notifications, auto_refresh, updated_at)
     VALUES($1,$2,$3,NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       in_app_notifications=EXCLUDED.in_app_notifications,
       auto_refresh=EXCLUDED.auto_refresh,
       updated_at=NOW()
     RETURNING in_app_notifications, auto_refresh`,
    [id, input.inAppNotifications, input.autoRefresh],
  )
).rows[0];

// Local demo account. Values can be replaced through environment variables.
export const ensureDefaultAdmin = async () => {
  // Keep this separate from the common "admin" username. A normal account may
  // already have claimed that name through registration.
  const username = process.env.ADMIN_USERNAME || 'airwatch_admin';
  const email = process.env.ADMIN_EMAIL || 'airwatch.admin@local';
  const password = process.env.ADMIN_PASSWORD || 'Admin@123';
  const existing = await findUserByUsername(username);

  if (existing) {
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await createUser(username, email, passwordHash, 'admin');
  console.log(`Created local administrator account: ${username}`);
};
