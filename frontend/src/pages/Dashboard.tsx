import { useState } from 'react';
import { ChevronDown, Calendar, Building2, Clock, MapPin, Activity, Wind, Cloud, Factory, Info, Leaf } from 'lucide-react';
import { AirData } from '../hooks/useAirData';
import { useTrend } from '../hooks/useTrend';
import TrendChart from '../components/TrendChart';
import { Badge, Skyline, StationPhoto, State } from '../components/Bits';
import { aqiTone, fmtDateTime, getAQICategory, getLatestReadingPerStation } from '../utils/aqi';

const POLLUTANTS = [
  ['pm2_5', 'PM2.5', 'Fine particles that can enter your lungs', Activity, 'red', 150],
  ['pm10', 'PM10', 'Coarse particles that affect respiratory health', Wind, 'amber', 250],
  ['no2', 'NO₂', 'Nitrogen dioxide from vehicles and industry', Cloud, 'blue', 200],
  ['so2', 'SO₂', 'Sulfur dioxide from industrial activities', Factory, 'purple', 100],
] as const;

export default function Dashboard({ d }: { d: AirData }) {
  const [sel, setSel] = useState<number | null>(null);
  const [hours, setHours] = useState(24);
  const latest = getLatestReadingPerStation(d.readings);
  const cur = sel ?? d.stations[0]?.id ?? null;
  const trend = useTrend(cur, hours, d.readings.length);

  if (d.loading) return <State>Loading air quality data...</State>;
  if (d.error) return <State error>{d.error}</State>;

  const vals = Object.values(latest);
  const overall = vals.length ? Math.round(vals.reduce((s, r) => s + r.aqi, 0) / vals.length) : null;
  const updated = vals.length ? vals.reduce((a, r) => (r.recorded_at > a ? r.recorded_at : a), vals[0].recorded_at) : null;
  const station = d.stations.find((s) => s.id === cur);
  const reading = cur !== null ? latest[cur] : undefined;
  const rows = d.readings.filter((r) => r.station_id === cur).sort((a, b) => +new Date(b.recorded_at) - +new Date(a.recorded_at)).slice(0, 5);

  return (
    <>
      <section className="hero">
        <Skyline />
        <Leaf className="hero-leaf" strokeWidth={1.4} />
        <div><h1>Urban Air Quality Monitoring System</h1><p>Chennai monitoring network <i>|</i> Real-time air quality data for a cleaner and healthier city</p></div>
      </section>

      <section className="kpis">
        <div className={`aqi-hero ${overall !== null ? `tone-${aqiTone(overall)}` : ''}`}>
          <div className="aqi-top">
            <h3>Overall City AQI <Info size={15} /></h3>
            <b>{overall ?? '--'}</b>
            {overall !== null && <span className="chip">{getAQICategory(overall).label}</span>}
          </div>
          <div className="aqi-foot">
            <span><Building2 size={18} />{d.stations.length} Monitoring Stations</span>
            <span><Clock size={18} /><small>Updated<br />{updated ? fmtDateTime(updated) : '--'}</small></span>
          </div>
        </div>
       {POLLUTANTS.map(([k, name, note, Icon, color, max]) => {
  const v = reading?.[k] != null ? Number(reading[k]) : null;

  return (
    <div className={`kpi c-${color}`} key={k}>
      <div className="kpi-head">
        <span className="kpi-ico">
          <Icon size={22} />
        </span>
        <h4>{name}</h4>
      </div>

      <b>{v !== null ? v.toFixed(2) : '--'}</b>
      <small>µg/m³</small>

      <div className="bar">
        <i
          style={{
            width: `${v === null ? 0 : Math.min(100, (v / max) * 100)}%`
          }}
        />
      </div>

      <p>{note}</p>
    </div>
  );
})}
      </section>

      <section className="split">
        <div className="card">
          <div className="card-head">
            <h3><Activity size={20} className="ico-blue" />Pollution Trend — {station?.name ?? '...'}</h3>
            <div className="selects">
              <div className="select"><select value={cur ?? ''} onChange={(e) => setSel(Number(e.target.value))}>{d.stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select><ChevronDown size={14} /></div>
              <div className="select"><Calendar size={14} /><select value={hours} onChange={(e) => setHours(Number(e.target.value))}><option value={24}>Last 24 Hours</option><option value={168}>Last 7 Days</option></select><ChevronDown size={14} /></div>
            </div>
          </div>
          <TrendChart data={trend} days={hours > 24} />
        </div>

        <div className="card">
          <div className="card-head"><h3><MapPin size={20} className="ico-blue" />Monitoring Stations</h3><a href="#stations">View All</a></div>
          <div className="st-list">
            {d.stations.slice(0, 3).map((s) => {
              const r = latest[s.id];
              return (
                <div className="st-row" key={s.id}>
                  <StationPhoto id={s.id} />
                  <p><b>{s.name}</b><small>{s.location_name}</small></p>
                  {r && <div className={`aqi-tile tone-${aqiTone(r.aqi)}`}><small>AQI</small><b>{r.aqi}</b><em>{getAQICategory(r.aqi).label}</em></div>}
                  <span className="coord"><MapPin size={15} /><small>{s.latitude}<br />{s.longitude}</small></span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-head"><h3><Activity size={20} className="ico-blue" />Recent Readings — {station?.name ?? '...'}</h3><a href="#reports">View All</a></div>
        <ReadingsTable rows={rows} name={station?.name ?? ''} />
        <p className="source-note">Location-based air-quality estimates from the <a href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noreferrer">Open-Meteo Air Quality API</a> (CAMS model), refreshed every 15 minutes. These are not physical sensor readings.</p>
      </section>
    </>
  );
}

import { Reading } from '../types';
export function ReadingsTable({ rows, name }: { rows: Reading[]; name: string }) {
  if (!rows.length) return <State>No readings recorded for this station yet.</State>;
  return (
    <div className="table-wrap"><table>
      <thead><tr><th>Recorded At (IST)</th><th>Station</th><th>AQI</th><th>PM2.5 (µg/m³)</th><th>PM10 (µg/m³)</th><th>NO2 (µg/m³)</th><th>SO2 (µg/m³)</th><th>Status</th></tr></thead>
      <tbody>{rows.map((r) => (
        <tr key={r.id}><td>{fmtDateTime(r.recorded_at).replace(/, (\d)/, ', $1')}</td><td>{name}</td>
          <td className={`aqi-num tone-${aqiTone(r.aqi)}`}>{r.aqi}</td><td>{r.pm2_5}</td><td>{r.pm10}</td><td>{r.no2}</td><td>{r.so2}</td>
          <td><Badge aqi={r.aqi} tint /></td></tr>))}
      </tbody></table></div>
  );
}
