import { Download } from 'lucide-react';
import { AirData } from '../hooks/useAirData';
import { State } from '../components/Bits';
import { aqiTone, fmtDateTime } from '../utils/aqi';
import { Badge } from '../components/Bits';

export default function Reports({ d }: { d: AirData }) {
  const name = (id: number) => d.stations.find((s) => s.id === id)?.name ?? `Station ${id}`;
  const rows = [...d.readings].sort((a, b) => +new Date(b.recorded_at) - +new Date(a.recorded_at));
  const exportCsv = () => {
    const csv = ['recorded_at,station,aqi,pm2_5,pm10,no2,so2', ...rows.map((r) => [r.recorded_at, name(r.station_id), r.aqi, r.pm2_5, r.pm10, r.no2, r.so2].join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'airwatch-readings.csv'; a.click();
  };
  return (
    <>
      <div className="page-head"><div><h1>Reports</h1><p>All recorded readings across the Chennai network</p></div>
        <button className="btn green" onClick={exportCsv} disabled={!rows.length}><Download size={18} />Export CSV</button></div>
      {!rows.length ? <State>No readings to report yet.</State> : (
        <div className="card table-wrap"><table>
          <thead><tr><th>Recorded At (IST)</th><th>Station</th><th>AQI</th><th>PM2.5</th><th>PM10</th><th>NO2</th><th>SO2</th><th>Status</th></tr></thead>
          <tbody>{rows.slice(0, 200).map((r) => <tr key={r.id}><td>{fmtDateTime(r.recorded_at)}</td><td>{name(r.station_id)}</td>
            <td className={`aqi-num tone-${aqiTone(r.aqi)}`}>{r.aqi}</td><td>{r.pm2_5}</td><td>{r.pm10}</td><td>{r.no2}</td><td>{r.so2}</td><td><Badge aqi={r.aqi} tint /></td></tr>)}</tbody>
        </table></div>
      )}
    </>
  );
}
