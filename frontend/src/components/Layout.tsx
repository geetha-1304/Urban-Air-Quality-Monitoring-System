import { ReactNode, useEffect, useState } from 'react';
import { LayoutDashboard, MapPin, BarChart3, TrendingUp, FileText, Settings, Search, Bell, Calendar, LogOut, CirclePlus, ClipboardList, ShieldCheck, UsersRound, UserRound } from 'lucide-react';
import { fmtNow } from '../utils/aqi';
import { User } from '../types/user';
import { Station } from '../types';
import { AppNotification, NotificationFeed } from '../types/notification';
import { getNotifications, getPreferences, markAllNotificationsRead, markNotificationRead } from '../services/api';

const NAV = [
  ['dashboard', 'Dashboard', LayoutDashboard], ['stations', 'Monitoring Stations', MapPin],
  ['air-quality', 'Air Quality', BarChart3], ['trends', 'Trends', TrendingUp],
  ['reports', 'Reports', FileText],
] as const;

interface Props {
  page: string; user: User;
  onLogout: () => void; children: ReactNode;
  stations: Station[]; onSearch: (query: string) => void;
}

export default function Layout({ page, user, onLogout, children, stations, onSearch }: Props) {
  const [now, setNow] = useState(new Date());
  const [notifications, setNotifications] = useState(false);
  const [notificationFeed, setNotificationFeed] = useState<NotificationFeed>({ notifications: [], unread: 0 });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [query, setQuery] = useState('');
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  useEffect(() => {
    let active = true;
    const syncPreference = async () => {
      try {
        const preferences = await getPreferences();
        if (active) setNotificationsEnabled(preferences.in_app_notifications);
      } catch { /* Keep the notification feed enabled if preferences cannot load. */ }
    };
    void syncPreference();
    window.addEventListener('aw-preferences-changed', syncPreference);
    return () => { active = false; window.removeEventListener('aw-preferences-changed', syncPreference); };
  }, []);
  useEffect(() => {
    if (!notificationsEnabled) {
      setNotifications(false);
      return;
    }
    let active = true;
    const load = async () => {
      try { const next = await getNotifications(); if (active) setNotificationFeed(next); }
      catch { /* The bell remains usable when the API is temporarily unavailable. */ }
    };
    void load();
    const timer = window.setInterval(() => { void load(); }, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, [notificationsEnabled]);
  const [date, time] = fmtNow(now).split('|');
  const readOne = async (note: AppNotification) => {
    if (!note.is_read) {
      try { await markNotificationRead(note.id); } catch { return; }
      setNotificationFeed((feed) => ({ ...feed, unread: Math.max(0, feed.unread - 1), notifications: feed.notifications.map((item) => item.id === note.id ? { ...item, is_read: true } : item) }));
    }
    setNotifications(false);
  };
  const readAll = async () => {
    try { await markAllNotificationsRead(); }
    catch { return; }
    setNotificationFeed((feed) => ({ ...feed, unread: 0, notifications: feed.notifications.map((note) => ({ ...note, is_read: true })) }));
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <nav>
          {[...NAV, ...(user.role === 'admin'
            ? [['pollution-reports', 'Pollution Reports', ShieldCheck] as const, ['users', 'Users', UsersRound] as const]
            : [['report-pollution', 'Report Pollution', CirclePlus] as const, ['my-reports', 'My Reports', ClipboardList] as const]), ['settings', 'Settings', Settings] as const].map(([key, label, Icon]) => (
            <a key={key} href={`#${key}`} className={page === key ? 'active' : ''}>
              <Icon size={20} /><span>{label}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-account" aria-label="Signed in account">
          <UserRound size={20} />
          <p><b>{user.role === 'admin' ? 'Administrator' : user.username}</b><small>{user.role === 'admin' ? 'Admin account' : 'Signed in user'}</small></p>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <form className="search" onSubmit={(e) => { e.preventDefault(); onSearch(query); }}><Search size={18} /><input list="station-options" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search stations, data or reports..." aria-label="Search stations" /><datalist id="station-options">{stations.map((s) => <option key={s.id} value={s.name} />)}</datalist>{query && <button type="button" className="search-clear" onClick={() => { setQuery(''); onSearch(''); }}>×</button>}</form>
          <div className="top-right">
            <div className="datebox"><Calendar size={18} /><p><b>{date}</b><small>{time}</small></p></div>
            <div className="notification-wrap"><button className="icon-btn" aria-label="Notifications" aria-expanded={notifications} disabled={!notificationsEnabled} title={notificationsEnabled ? 'Notifications' : 'Notifications are disabled in Preferences'} onClick={() => setNotifications((n) => !n)}><Bell size={20} />{notificationsEnabled && notificationFeed.unread > 0 && <em>{notificationFeed.unread > 9 ? '9+' : notificationFeed.unread}</em>}</button>
              {notifications && <div className="notification-panel"><div className="notification-head"><b>Notifications</b>{notificationFeed.unread > 0 && <button type="button" onClick={() => { void readAll(); }}>Mark all read</button>}</div>
                {notificationFeed.notifications.length ? <div className="notification-list">{notificationFeed.notifications.map((note) => <a key={note.id} className={note.is_read ? 'read' : 'unread'} href={note.link || '#dashboard'} onClick={() => { void readOne(note); }}><b>{note.title}</b><span>{note.message}</span><small>{new Date(note.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</small></a>)}</div> : <p className="notification-empty">You have no notifications yet.</p>}
              </div>}
            </div>
            <button className="icon-btn logout-btn" onClick={onLogout} aria-label="Log out" title="Log out"><LogOut size={21} /></button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
