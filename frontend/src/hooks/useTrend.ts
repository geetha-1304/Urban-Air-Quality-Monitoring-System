import { useEffect, useState } from 'react';
import { TrendPoint } from '../types';
import { getStationTrends } from '../services/api';

// range: hours to look back
export const useTrend = (stationId: number | null, hours: number, readingsVersion = 0) => {
  const [data, setData] = useState<TrendPoint[]>([]);
  useEffect(() => {
    if (stationId === null) { setData([]); return; }
    let cancel = false;
    getStationTrends(stationId).then((rows) => {
      if (cancel) return;
      const sorted = [...rows].sort((a, b) => +new Date(a.recorded_at) - +new Date(b.recorded_at));
      const latest = sorted.length ? +new Date(sorted[sorted.length - 1].recorded_at) : 0;
      setData(sorted.filter((r) => +new Date(r.recorded_at) >= latest - hours * 3600_000));
    });
    return () => { cancel = true; };
  }, [stationId, hours, readingsVersion]);
  return data;
};
