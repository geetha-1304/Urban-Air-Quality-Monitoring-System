import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendPoint } from '../types';
import { fmtAxis, fmtDateTime } from '../utils/aqi';

const LINES = [['pm2_5', 'PM2.5', '#ef4444'], ['pm10', 'PM10', '#f59e0b'], ['no2', 'NO2', '#2563eb'], ['so2', 'SO2', '#7c3aed']] as const;

export default function TrendChart({ data, days, height = 250 }: { data: TrendPoint[]; days: boolean; height?: number }) {
  if (!data.length) return <div className="state">No trend data for this station and range yet.</div>;
  const rows = data.map((d) => ({ ...d, label: fmtAxis(d.recorded_at, days) }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#e6ecf1" vertical={false} />
        <XAxis dataKey="label" interval="preserveStartEnd" minTickGap={28} tick={{ fontSize: 12, fill: '#5b6b7b' }} tickLine={false} axisLine={{ stroke: '#cfd8e0' }} />
        <YAxis tick={{ fontSize: 12, fill: '#5b6b7b' }} tickLine={false} axisLine={false}
          label={{ value: 'Concentration (µg/m³)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#5b6b7b', textAnchor: 'middle' } }} />
        <Tooltip labelFormatter={(label, payload) => payload[0]?.payload?.recorded_at ? fmtDateTime(payload[0].payload.recorded_at) : label}
          formatter={(value, name) => [Number(value).toFixed(2) + ' µg/m³', name]}
          contentStyle={{ borderRadius: 10, border: '1px solid #e2e8ee', fontSize: 12 }} />
        <Legend iconType="plainline" wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
        {LINES.map(([k, n, c]) => <Line key={k} type="monotone" dataKey={k} name={n} stroke={c} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />)}
      </LineChart>
    </ResponsiveContainer>
  );
}
