export interface AppNotification {
  id: number;
  type: 'new_user' | 'report_submitted' | 'report_status' | 'report_response' | string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationFeed {
  notifications: AppNotification[];
  unread: number;
}
