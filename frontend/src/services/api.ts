import axios from 'axios';
import { Station, Reading, TrendPoint, ApiResponse } from '../types';
import { User, UserPreferences } from '../types/user';
import { PollutionReportList, PollutionReport, PollutionReportStats, PollutionReportStatus } from '../types/pollutionReport';
import { NotificationFeed } from '../types/notification';

const api = axios.create({ baseURL: 'http://localhost:5000/api', timeout: 8000 });

// ---- session (remember me = localStorage, otherwise sessionStorage) ----
const store = () => (localStorage.getItem('aw_token') ? localStorage : sessionStorage);
export const getToken = () => localStorage.getItem('aw_token') ?? sessionStorage.getItem('aw_token');
export const loadUser = (): User | null => {
  try { return JSON.parse(store().getItem('aw_user') || 'null'); } catch { return null; }
};
export const clearSession = () => {
  for (const s of [localStorage, sessionStorage]) { s.removeItem('aw_token'); s.removeItem('aw_user'); }
};
api.interceptors.request.use((cfg) => {
  const t = getToken();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

// POST /api/auth/login  (your backend expects { username, password })
export const login = async (username: string, password: string, remember: boolean): Promise<User> => {
  const res = await api.post<ApiResponse<{ token: string; user: User }>>('/auth/login', { username, password });
  return saveSession(res.data.data!, remember);
};
const saveSession = ({ token, user }: { token: string; user: User }, remember: boolean): User => {
  clearSession();
  const s = remember ? localStorage : sessionStorage;
  s.setItem('aw_token', token);
  s.setItem('aw_user', JSON.stringify(user));
  return user;
};
export const register = async (username: string, email: string, password: string): Promise<User> =>
  (await api.post<ApiResponse<User>>('/auth/register', { username, email, password })).data.data!;
export const resetPassword = async (username: string, email: string, newPassword: string): Promise<void> => {
  await api.post('/auth/forgot-password', { username, email, newPassword });
};
export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  await api.post('/auth/change-password', { currentPassword, newPassword });
};
export const getPreferences = async (): Promise<UserPreferences> =>
  (await api.get<ApiResponse<UserPreferences>>('/auth/preferences')).data.data ?? { in_app_notifications: true, auto_refresh: true };
export const savePreferences = async (input: UserPreferences): Promise<UserPreferences> =>
  (await api.put<ApiResponse<UserPreferences>>('/auth/preferences', {
    inAppNotifications: input.in_app_notifications,
    autoRefresh: input.auto_refresh,
  })).data.data!;

export const checkHealth = async () => { try { await api.get('/health'); return true; } catch { return false; } };
export const getStations = async () => (await api.get<ApiResponse<Station[]>>('/stations')).data.data ?? [];
export const getReadings = async () => (await api.get<ApiResponse<Reading[]>>('/readings')).data.data ?? [];
export const refreshLiveData = async () => api.post('/readings/refresh', {}, { timeout: 60000 });
export const getStationTrends = async (id: number): Promise<TrendPoint[]> => {
  try { return (await api.get<ApiResponse<TrendPoint[]>>(`/readings/trends/${id}`)).data.data ?? []; } catch { return []; }
};
export const createStation = async (b: { name: string; location_name: string; latitude?: number; longitude?: number }) =>
  (await api.post<ApiResponse<Station>>('/stations', b)).data.data;

export const getUsers = async (): Promise<User[]> =>
  (await api.get<ApiResponse<User[]>>('/auth/users')).data.data ?? [];

export const getNotifications = async (): Promise<NotificationFeed> =>
  (await api.get<ApiResponse<NotificationFeed>>('/notifications')).data.data ?? { notifications: [], unread: 0 };
export const markNotificationRead = async (id: number): Promise<void> => {
  await api.patch(`/notifications/${id}/read`);
};
export const markAllNotificationsRead = async (): Promise<void> => {
  await api.patch('/notifications/read-all');
};

export const submitPollutionReport = async (form: FormData) =>
  (await api.post<ApiResponse<PollutionReport>>('/reports', form, { timeout: 30000 })).data.data!;
export interface ResolvedLocation { address: string; latitude: number; longitude: number; }
export const reverseGeocodeLocation = async (latitude: number, longitude: number): Promise<ResolvedLocation> =>
  (await api.get<ApiResponse<ResolvedLocation>>('/reports/reverse-geocode', { params: { latitude, longitude }, timeout: 15_000 })).data.data!;
export const getMyPollutionReports = async (params: { page: number; pageSize: number; search?: string; status?: string; pollutionType?: string; sort?: string }) =>
  (await api.get<ApiResponse<PollutionReportList>>('/reports/my', { params })).data.data!;
export const getMyPollutionReport = async (id: number) =>
  (await api.get<ApiResponse<PollutionReport>>(`/reports/my/${id}`)).data.data!;
export const getAdminPollutionReports = async (params: { page: number; pageSize: number; search?: string; status?: string; pollutionType?: string; location?: string; submittedFrom?: string; submittedTo?: string; sort?: string }) =>
  (await api.get<ApiResponse<PollutionReportList>>('/reports', { params })).data.data!;
export const getAdminPollutionReportStats = async () =>
  (await api.get<ApiResponse<PollutionReportStats>>('/reports/admin/stats')).data.data!;
export const getAdminPollutionReport = async (id: number) =>
  (await api.get<ApiResponse<PollutionReport>>(`/reports/${id}`)).data.data!;
export const setPollutionReportStatus = async (id: number, status: PollutionReportStatus, note?: string) =>
  (await api.patch<ApiResponse<PollutionReport>>(`/reports/${id}/status`, status === 'Rejected' ? { status, rejectionReason: note } : { status, remarks: note })).data.data!;
export const savePollutionReportRemarks = async (id: number, remarks: string) =>
  (await api.patch<ApiResponse<PollutionReport>>(`/reports/${id}/remarks`, { remarks })).data.data!;
export const fetchPollutionReportImage = async (id: number) =>
  (await api.get<Blob>(`/reports/${id}/image`, { responseType: 'blob' })).data;

export const errMsg = (e: unknown, fallback: string) =>
  (axios.isAxiosError(e) && e.response?.data?.message) || fallback;
export default api;
