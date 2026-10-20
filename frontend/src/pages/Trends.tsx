import { useMemo, useState } from 'react';
import { Activity, BarChart3, CalendarDays, ChevronDown, CircleHelp } from 'lucide-react';
import { AirData } from '../hooks/useAirData';
import { useTrend } from '../hooks/useTrend';
import TrendChart from '../components/TrendChart';
import { State } from '../components/Bits';

const average = (values: number[]) => values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1) : '—';

export default function Trends({ d }: { d: AirData }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hours, setHours] = useState(168);
  const stationId = selectedId ?? d.stations[0]?.id ?? null;
  const station = d.stations.find((item) => item.id === stationId);
  const trend = useTrend(stationId, hours, d.readings.length);
  const stats = useMemo(() => ({
    pm25: average(trend.map((point) => Number(point.pm2_5)).filter(Number.isFinite)),
    pm10: average(trend.map((point) => Number(point.pm10)).filter(Number.isFinite)),
    highAqi: trend.length ? Math.max(...trend.map((point) => point.aqi)) : null,
    lowAqi: trend.length ? Math.min(...trend.map((point) => point.aqi)) : null,
  }), [trend]);

  if (d.error) return <State error>{d.error}</State>;

  return (
    <>
      <div className="page-head trends-page-head">
        <div><h1>Pollution Trends</h1><p>Explore how pollution has changed over time at each station</p></div>
        <span className="observation-count"><BarChart3 size={16} />{trend.length} observations in range</span>
      </div>

      <section className="card trends-filter-card">
        <div className="trends-filters">
          <label>Select station<span className="select wide"><select value={stationId ?? ''} onChange={(event) => setSelectedId(Number(event.target.value))} aria-label="Select trend station">
            {d.stations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select><ChevronDown size={15} /></span></label>
          <label>Time range<span className="select wide"><select value={hours} onChange={(event) => setHours(Number(event.target.value))} aria-label="Select trend time range">
            <option value={24}>Last 24 hours</option><option value={168}>Last 7 days</option><option value={720}>Last 30 days</option>
          </select><ChevronDown size={15} /></span></label>
          <div className="trend-station-context"><small>Analyzing</small><b>{station?.name ?? 'No station selected'}</b><small>{station?.location_name ?? 'Choose a station to view its history'}</small></div>
        </div>
      </section>

      <section className="trend-summary-grid" aria-label="Historical summary statistics">
        <article className="card trend-stat"><span className="trend-stat-icon red"><Activity size={18} /></span><small>Average PM2.5</small><b>{stats.pm25}<em>µg/m³</em></b><span>Across selected time range</span></article>
        <article className="card trend-stat"><span className="trend-stat-icon amber"><Activity size={18} /></span><small>Average PM10</small><b>{stats.pm10}<em>µg/m³</em></b><span>Across selected time range</span></article>
        <article className="card trend-stat"><span className="trend-stat-icon red"><BarChart3 size={18} /></span><small>Highest recorded AQI</small><b>{stats.highAqi ?? '—'}</b><span>{stats.highAqi === null ? 'No AQI records in range' : 'Within selected time range'}</span></article>
        <article className="card trend-stat"><span className="trend-stat-icon green"><BarChart3 size={18} /></span><small>Lowest recorded AQI</small><b>{stats.lowAqi ?? '—'}</b><span>{stats.lowAqi === null ? 'No AQI records in range' : 'Within selected time range'}</span></article>
      </section>

      <section className="card trend-chart-card">
        <div className="card-head trend-chart-head"><div><h3><Activity size={20} className="ico-blue" />Historical Pollution</h3><p className="section-caption">Pollutant concentration over time · µg/m³</p></div><span className="range-label"><CalendarDays size={15} />{hours === 24 ? '24 hours' : hours === 168 ? '7 days' : '30 days'}</span></div>
        {d.loading ? <State>Loading historical readings…</State> : trend.length === 0 ? (
          <div className="history-empty"><CircleHelp size={22} /><div><b>No historical readings for this range</b><p>Available records will appear here as the station feed is refreshed. No sample values are generated.</p></div></div>
        ) : <>
          {trend.length === 1 && <div className="history-limited"><CircleHelp size={18} /><span>Only one historical observation is available in this range. The chart shows that recorded point; more readings are needed to show a changing trend.</span></div>}
          <TrendChart data={trend} days={hours > 24} height={440} />
        </>}
      </section>
      <p className="trend-source-note">Statistics are calculated from the selected station’s saved historical readings. Current and past periods with limited records are shown as available.</p>
    </>
  );
}
