import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ClipboardList, Eye, Search } from 'lucide-react';
import { State } from '../components/Bits';
import PollutionReportDetails from '../components/PollutionReportDetails';
import { errMsg, getMyPollutionReports, getMyPollutionReport } from '../services/api';
import { POLLUTION_TYPES, PollutionReport, PollutionReportList, REPORT_STATUSES } from '../types/pollutionReport';
import { fmtDateTime } from '../utils/aqi';

export default function MyReports() {
  const [data, setData] = useState<PollutionReportList | null>(null);
  const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [pollutionType, setPollutionType] = useState(''); const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [selected, setSelected] = useState<PollutionReport | null>(null); const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let active = true; const timer = window.setTimeout(() => {
      setLoading(true); setError('');
      getMyPollutionReports({ page, pageSize: 10, search: search.trim() || undefined, status: status || undefined, pollutionType: pollutionType || undefined, sort })
        .then((result) => { if (active) { setData(result); if (result.page !== page) setPage(result.page); } })
        .catch((e) => { if (active) setError(errMsg(e, 'Could not load your reports.')); })
        .finally(() => { if (active) setLoading(false); });
    }, 180);
    return () => { active = false; window.clearTimeout(timer); };
  }, [page, search, status, pollutionType, sort]);

  const openDetails = async (report: PollutionReport) => {
    setDetailLoading(true); setError('');
    try { setSelected(await getMyPollutionReport(report.id)); }
    catch (e) { setError(errMsg(e, 'Could not open report details.')); }
    finally { setDetailLoading(false); }
  };

  return (
    <>
      <div className="page-head"><div><h1>My Reports</h1><p>Review the pollution incidents you have submitted and their latest status.</p></div><a className="btn green" href="#report-pollution">Report pollution</a></div>
      <section className="card reports-filter-card">
        <label className="report-filter search-filter"><span>Search reports</span><div className="input-icon-wrap"><Search size={17} /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Title or location" /></div></label>
        <label className="report-filter"><span>Status</span><select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{REPORT_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="report-filter"><span>Pollution type</span><select value={pollutionType} onChange={(e) => { setPollutionType(e.target.value); setPage(1); }}><option value="">All types</option>{POLLUTION_TYPES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="report-filter"><span>Sort</span><select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
      </section>
      {error && <div className="form-err" role="alert">{error}</div>}
      {loading ? <State>Loading your reports…</State> : !data?.total ? <div className="card report-empty"><ClipboardList size={34} /><h2>{search || status || pollutionType ? 'No reports match these filters' : 'No pollution reports yet'}</h2><p>When you submit an incident report, it will appear here with its review status.</p>{!search && !status && !pollutionType && <a className="btn green" href="#report-pollution">Submit a report</a>}</div> : (
        <section className="card table-wrap report-table-wrap"><table className="report-table"><thead><tr><th>ID</th><th>Title</th><th>Pollution type</th><th>Location</th><th>Mobile</th><th>Submitted</th><th>Incident time</th><th>Status</th><th>Details</th></tr></thead>
          <tbody>{data.reports.map((report) => <tr key={report.id}><td>#{report.id}</td><td className="report-title-cell">{report.title}</td><td>{report.pollution_type}</td><td>{report.location}</td><td>{report.mobile_number ?? '—'}</td><td>{fmtDateTime(report.created_at)}</td><td>{fmtDateTime(report.incident_at)}</td><td><span className={`report-status status-${report.status.toLowerCase().replace(/\s+/g, '-')}`}>{report.status}</span></td><td><button type="button" className="report-view-btn" onClick={() => void openDetails(report)} disabled={detailLoading}><Eye size={15} />View</button></td></tr>)}</tbody>
        </table></section>
      )}
      {!!data?.total && <div className="report-pagination"><span>{data.total} report{data.total === 1 ? '' : 's'} · page {data.page} of {Math.max(1, data.pageCount)}</span><div><button className="icon-btn" aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => setPage((n) => Math.max(1, n - 1))}><ChevronLeft size={18} /></button><button className="icon-btn" aria-label="Next page" disabled={page >= data.pageCount || loading} onClick={() => setPage((n) => n + 1)}><ChevronRight size={18} /></button></div></div>}
      {selected && <PollutionReportDetails report={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
