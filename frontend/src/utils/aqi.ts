import { Reading, AQICategory } from '../types';

export type Tone = 'good' | 'moderate' | 'usg' | 'unhealthy' | 'very' | 'haz';
export const aqiTone = (aqi: number): Tone =>
  aqi <= 50 ? 'good' : aqi <= 100 ? 'moderate' : aqi <= 150 ? 'usg' : aqi <= 200 ? 'unhealthy' : aqi <= 300 ? 'very' : 'haz';

export const getAQICategory = (aqi: number): AQICategory => {
  const label = (['Good', 'Moderate', 'Unhealthy for Sensitive Groups', 'Unhealthy', 'Very Unhealthy', 'Hazardous'] as const)[
    ['good', 'moderate', 'usg', 'unhealthy', 'very', 'haz'].indexOf(aqiTone(aqi))
  ];
  return { label, colorVar: 'var(--t)' };
};

export const getLatestReadingPerStation = (readings: Reading[]): Record<number, Reading> => {
  const out: Record<number, Reading> = {};
  for (const r of readings) {
    const c = out[r.station_id];
    if (!c || new Date(r.recorded_at) > new Date(c.recorded_at)) out[r.station_id] = r;
  }
  return out;
};

const IST = 'Asia/Kolkata';
export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { timeZone: IST, month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    .replace(/(\d{4}),/, '$1,');
export const fmtNow = (d: Date) =>
  d.toLocaleDateString('en-US', { timeZone: IST, weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' }) +
  '|' + d.toLocaleTimeString('en-US', { timeZone: IST, hour: '2-digit', minute: '2-digit' }) + ' IST';
export const fmtAxis = (iso: string, days: boolean) =>
  days
    ? new Date(iso).toLocaleDateString('en-US', { timeZone: IST, month: 'short', day: 'numeric' })
    : new Date(iso).toLocaleTimeString('en-US', { timeZone: IST, hour: 'numeric' });
