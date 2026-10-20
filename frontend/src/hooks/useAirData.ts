import { useCallback, useEffect, useState } from 'react';
import { Station, Reading } from '../types';
import { checkHealth, getStations, getReadings } from '../services/api';

export const useAirData = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [online, setOnline] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(() => localStorage.getItem('aw_auto_refresh') !== 'false');

  const refresh = useCallback(async (manual = false) => {
    manual ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setOnline(await checkHealth());
      const [s, r] = await Promise.all([getStations(), getReadings()]);
      setStations(s); setReadings(r);
    } catch {
      setOnline(false);
      setError('Could not reach the backend at http://localhost:5000. Start the server and refresh.');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    const syncPreference = () => setAutoRefresh(localStorage.getItem('aw_auto_refresh') !== 'false');
    window.addEventListener('aw-preferences-changed', syncPreference);
    return () => window.removeEventListener('aw-preferences-changed', syncPreference);
  }, []);
  useEffect(() => {
    refresh();
    if (!autoRefresh) return;
    const timer = window.setInterval(() => refresh(true), 60_000);
    return () => window.clearInterval(timer);
  }, [refresh, autoRefresh]);
  return { stations, readings, online, loading, refreshing, error, refresh };
};
export type AirData = ReturnType<typeof useAirData>;
