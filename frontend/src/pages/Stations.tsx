import { FormEvent, useState } from 'react';
import { Plus, MapPin, X } from 'lucide-react';
import { AirData } from '../hooks/useAirData';
import { StationPhoto, State } from '../components/Bits';
import { aqiTone, getAQICategory, getLatestReadingPerStation } from '../utils/aqi';
import { createStation, errMsg, getToken } from '../services/api';
import { User } from '../types/user';

export default function Stations({ d, query = '', user }: { d: AirData; query?: string; user: User }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', location_name: '', latitude: '', longitude: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const latest = getLatestReadingPerStation(d.readings);
  const visibleStations = d.stations.filter((s) => `${s.name} ${s.location_name}`.toLowerCase().includes(query.trim().toLowerCase()));

  const save = async (e: FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      await createStation({ name: f.name, location_name: f.location_name,
        latitude: f.latitude ? Number(f.latitude) : undefined, longitude: f.longitude ? Number(f.longitude) : undefined });
      setOpen(false); setF({ name: '', location_name: '', latitude: '', longitude: '' }); d.refresh(true);
    } catch (x) { setErr(errMsg(x, 'Could not add the station. Log in again and retry.')); }
    finally { setBusy(false); }
  };

  return (
    <>
      <div className="page-head">
        <div><h1>Monitoring Stations</h1><p>Manage and view all air quality monitoring stations in Chennai</p></div>
        {user.role === 'admin' && <button className="btn green" onClick={() => setOpen(true)} disabled={!getToken()}><Plus size={18} />Add Station</button>}
      </div>
      {d.loading ? <State>Loading stations...</State> : d.error ? <State error>{d.error}</State> : !d.stations.length ? <State>No stations yet. Add your first station to start monitoring.</State> : (
        visibleStations.length ? <div className="st-grid">
          {visibleStations.map((s) => {
            const r = latest[s.id];
            return (
              <article className="card st-card" key={s.id}>
                <StationPhoto id={s.id} />
                <h3>{s.name}</h3><p className="muted">{s.location_name}</p>
                {r && <div className={`aqi-strip tone-${aqiTone(r.aqi)}`}><small>AQI</small><b>{r.aqi}</b><em>{getAQICategory(r.aqi).label}</em></div>}
                <p className="loc"><MapPin size={15} />{s.latitude}, {s.longitude}</p>
                {r && <div className="mini">{([['PM2.5', r.pm2_5], ['PM10', r.pm10], ['NO2', r.no2], ['SO2', r.so2]] as const).map(([n, v]) => <span key={n}><small>{n}</small><b>{v}</b></span>)}</div>}
                <p className="online"><i className="dot on" />Online</p>
              </article>
            );
          })}
        </div> : <State>No stations match “{query}”.</State>
      )}
      {open && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <div className="card-head"><h3>Add Station</h3><button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Close"><X size={18} /></button></div>
            <label>Station name<input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
            <label>Location<input required value={f.location_name} onChange={(e) => setF({ ...f, location_name: e.target.value })} /></label>
            <div className="two"><label>Latitude<input type="number" step="any" value={f.latitude} onChange={(e) => setF({ ...f, latitude: e.target.value })} /></label>
              <label>Longitude<input type="number" step="any" value={f.longitude} onChange={(e) => setF({ ...f, longitude: e.target.value })} /></label></div>
            {err && <div className="form-err">{err}</div>}
            <button className="btn green" disabled={busy}>{busy ? 'Saving...' : 'Save station'}</button>
          </form>
        </div>
      )}
    </>
  );
}
