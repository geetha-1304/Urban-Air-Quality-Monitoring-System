import { useMemo, useState } from 'react';
import { Activity, Building2, CalendarClock, ChevronDown, Clock3, Factory, MapPin, Radio, Wind, Cloud } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AirData } from '../hooks/useAirData';
import { Reading } from '../types';
import { aqiTone, fmtDateTime, getAQICategory, getLatestReadingPerStation } from '../utils/aqi';
import { State } from '../components/Bits';

const POLLUTANTS = [
  { key: 'pm2_5', label: 'PM2.5', description: 'Fine particles', color: '#ef4444', Icon: Activity },
  { key: 'pm10', label: 'PM10', description: 'Coarse particles', color: '#f59e0b', Icon: Wind },
  { key: 'no2', label: 'NO₂', description: 'Nitrogen dioxide', color: '#2563eb', Icon: Cloud },
  { key: 'so2', label: 'SO₂', description: 'Sulfur dioxide', color: '#7c3aed', Icon: Factory },
] as const;

const formatCoordinate = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate.toFixed(4) : null;
};

export default function AirQuality({ d }: { d: AirData }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const latest = useMemo(() => getLatestReadingPerStation(d.readings), [d.readings]);
  const stationId = selectedId ?? d.stations[0]?.id ?? null;
  const station = d.stations.find((item) => item.id === stationId);
  const reading = stationId === null ? undefined : latest[stationId];
  const latitude = formatCoordinate(station?.latitude);
  const longitude = formatCoordinate(station?.longitude);
  const updatedAt = reading ? new Date(reading.recorded_at) : null;
  const fresh = Boolean(d.online && updatedAt && Date.now() - updatedAt.getTime() < 3 * 60 * 60 * 1000);
  const chartData = reading ? POLLUTANTS.map((pollutant) => ({
    name: pollutant.label,
    value: Number(reading[pollutant.key as keyof Reading] ?? 0),
    color: pollutant.color,
  })) : [];
  const category = reading ? getAQICategory(reading.aqi) : null;
  const gaugeProgress = Math.max(0, Math.min(1, (reading?.aqi ?? 0) / 300));

  if (d.loading) return <State>Loading current air-quality readings…</State>;
  if (d.error) return <State error>{d.error}</State>;
  if (!d.stations.length) return <State>No monitoring stations are available yet.</State>;

  return (
    <>
      <div className="page-head air-page-head">
        <div><h1>Current Air Quality</h1><p>Live conditions across the Chennai monitoring network</p></div>
        <label className="air-station-select">Current station
          <span className="select wide"><select value={stationId ?? ''} onChange={(event) => setSelectedId(Number(event.target.value))} aria-label="Current station">
            {d.stations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select><ChevronDown size={15} /></span>
        </label>
      </div>

      <section className="air-current-grid" aria-label="Current AQI and pollutant values">
        <article className={`card current-aqi-card tone-${reading ? aqiTone(reading.aqi) : 'moderate'}`}>
          <div className="current-aqi-copy"><span className="eyebrow">CURRENT AIR QUALITY INDEX</span>
            <h2>{reading ? reading.aqi : '—'}</h2>
            <span className="chip">{category?.label ?? 'No current reading'}</span>
            <p>{station?.name ?? 'Select a station'} · Chennai</p>
          </div>
          <div className="aqi-gauge" role="img" aria-label={reading ? `AQI ${reading.aqi}, ${category?.label}` : 'AQI unavailable'}>
            <svg viewBox="0 0 132 132" aria-hidden="true">
              <circle className="gauge-track" cx="66" cy="66" r="53" />
              <circle className="gauge-value" cx="66" cy="66" r="53" style={{ strokeDashoffset: `${333 * (1 - gaugeProgress)}` }} />
            </svg>
            <div><b>{reading ? `${Math.round(gaugeProgress * 100)}%` : '—'}</b><small>of AQI scale</small></div>
          </div>
        </article>

        {POLLUTANTS.map(({ key, label, description, color, Icon }) => {
          const value = reading ? Number(reading[key as keyof Reading]) : null;
          return <article className="card current-pollutant-card" key={key}>
            <div className="current-pollutant-title"><span style={{ color, background: `${color}18` }}><Icon size={20} /></span><div><b>{label}</b><small>{description}</small></div></div>
            <strong>{value !== null && Number.isFinite(value) ? value.toFixed(2) : '—'}</strong>
            <small className="pollutant-unit">µg/m³</small>
            <div className="pollutant-track"><i style={{ width: `${value === null ? 0 : Math.min(100, value / (key === 'pm2_5' ? 150 : key === 'pm10' ? 250 : key === 'no2' ? 200 : 100) * 100)}%`, background: color }} /></div>
          </article>;
        })}
      </section>

      <section className="card current-comparison-card">
        <div className="card-head"><div><h3><Activity size={20} className="ico-blue" />Current Pollution Levels</h3><p className="section-caption">Latest estimated concentrations at {station?.name ?? 'the selected station'}</p></div>
          {updatedAt && <span className="updated-label"><Clock3 size={15} />Updated {fmtDateTime(reading!.recorded_at)}</span>}
        </div>
        {reading ? <div className="current-bar-chart">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 32, bottom: 4, left: 12 }}>
              <CartesianGrid stroke="#e6ecf1" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#5f7182' }} tickLine={false} axisLine={{ stroke: '#cfd8e0' }} unit=" µg/m³" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fill: '#334b5f', fontWeight: 600 }} tickLine={false} axisLine={false} width={72} />
              <Tooltip formatter={(value) => [`${Number(value).toFixed(2)} µg/m³`, 'Concentration']} cursor={{ fill: '#f2f6fa' }} />
              <Bar dataKey="value" name="Concentration" radius={[0, 7, 7, 0]} barSize={30}>
                {chartData.map((item) => <Cell key={item.name} fill={item.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div> : <div className="state">There is no current reading for this station yet. Refresh data or check back when the provider has an observation.</div>}
      </section>

      <section className="card current-station-card">
        <div className="card-head"><div><h3><MapPin size={20} className="ico-blue" />Current Station</h3><p className="section-caption">Station and observation details</p></div>
          <span className={`station-status ${fresh ? 'status-online' : 'status-offline'}`}><i className="dot" />{fresh ? 'Online' : 'Offline / stale data'}</span>
        </div>
        <div className="station-detail-grid">
          <div className="station-detail"><span className="detail-icon"><Building2 size={19} /></span><div><small>Station</small><b>{station?.name ?? '—'}</b></div></div>
          <div className="station-detail"><span className="detail-icon"><MapPin size={19} /></span><div><small>Location</small><b>{station?.location_name ?? '—'}</b><small>{latitude !== null && longitude !== null ? `${latitude}, ${longitude}` : 'Coordinates unavailable'}</small></div></div>
          <div className="station-detail"><span className="detail-icon"><CalendarClock size={19} /></span><div><small>Last updated (IST)</small><b>{reading ? fmtDateTime(reading.recorded_at) : 'No reading available'}</b></div></div>
          <div className="station-detail"><span className="detail-icon"><Radio size={19} /></span><div><small>Data source</small><b>Open-Meteo · CAMS model</b><small>Location estimate, not a physical sensor</small></div></div>
        </div>
      </section>
    </>
  );
}
