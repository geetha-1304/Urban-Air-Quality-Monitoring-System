export interface User { id: number; username: string; email: string; role: string; created_at?: string }

export interface UserPreferences {
  in_app_notifications: boolean;
  auto_refresh: boolean;
}
