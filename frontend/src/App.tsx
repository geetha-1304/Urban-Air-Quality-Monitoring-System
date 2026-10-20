import { useEffect, useState } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Stations from './pages/Stations';
import Trends from './pages/Trends';
import AirQuality from './pages/AirQuality';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import ReportPollution from './pages/ReportPollution';
import MyReports from './pages/MyReports';
import AdminReports from './pages/AdminReports';
import AdminUsers from './pages/AdminUsers';
import { useAirData } from './hooks/useAirData';
import { clearSession, loadUser } from './services/api';
import { User } from './types/user';
import { State } from './components/Bits';

const currentPage = () => window.location.hash.slice(1) || 'dashboard';

export default function App() {
  const [user, setUser] = useState<User | null>(loadUser);
  const [page, setPage] = useState(currentPage);
  const [stationSearch, setStationSearch] = useState('');
  const d = useAirData();
  useEffect(() => { const f = () => setPage(currentPage()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);

  if (!user) return <Login onLogin={(u) => { setUser(u); window.location.hash = 'dashboard'; }} />;

  const logout = () => { clearSession(); setUser(null); };
  const body =
    page === 'stations' ? <Stations d={d} query={stationSearch} user={user} /> :
    page === 'air-quality' ? <AirQuality d={d} /> :
    page === 'trends' ? <Trends d={d} /> :
    page === 'reports' ? <Reports d={d} /> :
    page === 'report-pollution' ? <ReportPollution /> :
    page === 'my-reports' ? <MyReports /> :
    page === 'pollution-reports' ? (user.role === 'admin' ? <AdminReports /> : <State error>Administrator access is required to view all pollution reports.</State>) :
    page === 'users' ? (user.role === 'admin' ? <AdminUsers /> : <State error>Administrator access is required to view registered users.</State>) :
    page === 'settings' ? <Settings d={d} user={user} /> : <Dashboard d={d} />;

  return (
    <Layout page={page} user={user} stations={d.stations}
      onSearch={(q) => { setStationSearch(q); if (q.trim()) window.location.hash = 'stations'; }}
      onLogout={logout}>{body}</Layout>
  );
}
