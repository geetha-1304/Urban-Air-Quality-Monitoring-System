import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ClipboardCheck, ClipboardList, Eye, Search } from 'lucide-react';
import { State } from '../components/Bits';
import PollutionReportDetails from '../components/PollutionReportDetails';
import { errMsg, getAdminPollutionReport, getAdminPollutionReportStats, getAdminPollutionReports } from '../services/api';
import { POLLUTION_TYPES, PollutionReport, PollutionReportList, PollutionReportStats, REPORT_STATUSES } from '../types/pollutionReport';
import { fmtDateTime } from '../utils/aqi';

const emptyStats: PollutionReportStats = { total: 0, pending: 0, under_review: 0, resolved: 0, rejected: 0 };

export default function AdminReports() {
  const [data, setData] = useState<PollutionReportList | null>(null); const [stats, setStats] = useState(emptyStats);
  const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [pollutionType, setPollutionType] = useState('');
  const [location, setLocation] = useState(''); const [submittedFrom, setSubmittedFrom] = useState(''); const [submittedTo, setSubmittedTo] = useState(''); const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [selected, setSelected] = useState<PollutionReport | null>(null); const [detailLoading, setDetailLoading] = useState(false); const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true; const timer = window.setTimeout(() => {
      setLoading(true); setError('');
      Promise.all([
        getAdminPollutionReports({ page, pageSize: 10, search: search.trim() || undefined, status: status || undefined, pollutionType: pollutionType || undefined, location: location.trim() || undefined, submittedFrom: submittedFrom || undefined, submittedTo: submittedTo || undefined, sort }),
        getAdminPollutionReportStats(),
      ]).then(([list, summary]) => { if (active) { setData(list); setStats(summary); if (list.page !== page) setPage(list.page); } })
        .catch((e) => { if (active) setError(errMsg(e, 'Could not load pollution reports.')); })
        .finally(() => { if (active) setLoading(false); });
    }, 160);
    return () => { active = false; window.clearTimeout(timer); };
  }, [page, search, status, pollutionType, location, submittedFrom, submittedTo, sort, revision]);

  const resetPage = () => setPage(1);
  const openDetails = async (report: PollutionReport) => {
    setDetailLoading(true); setError('');
    try { setSelected(await getAdminPollutionReport(report.id)); }
    catch (e) { setError(errMsg(e, 'Could not open report details.')); }
    finally { setDetailLoading(false); }
  };

  return (
    <>
      <div className="page-head"><div><h1>Pollution Reports</h1><p>Review incident reports submitted across the AirWatch network.</p></div></div>
      <section className="report-stat-grid" aria-label="Pollution report summary">
        <article className="report-stat-card"><span className="report-stat-icon teal"><ClipboardList size={20} /></span><small>Total reports</small><b>{stats.total}</b></article>
        <article className="report-stat-card"><span className="report-stat-icon amber"><ClipboardCheck size={20} /></span><small>Pending</small><b>{stats.pending}</b></article>
        <article className="report-stat-card"><span className="report-stat-icon blue"><ClipboardCheck size={20} /></span><small>Under review</small><b>{stats.under_review}</b></article>
        <article className="report-stat-card"><span className="report-stat-icon green"><ClipboardCheck size={20} /></span><small>Resolved</small><b>{stats.resolved}</b></article>
        <article className="report-stat-card"><span className="report-stat-icon red"><ClipboardCheck size={20} /></span><small>Rejected</small><b>{stats.rejected}</b></article>
      </section>
      <section className="card admin-report-filters">
        <label className="report-filter search-filter"><span>Search</span><div className="input-icon-wrap"><Search size={17} /><input value={search} onChange={(e) => { setSearch(e.target.value); resetPage(); }} placeholder="Title, location, or user" /></div></label>
        <label className="report-filter"><span>Status</span><select value={status} onChange={(e) => { setStatus(e.target.value); resetPage(); }}><option value="">All statuses</option>{REPORT_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="report-filter"><span>Pollution type</span><select value={pollutionType} onChange={(e) => { setPollutionType(e.target.value); resetPage(); }}><option value="">All types</option>{POLLUTION_TYPES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="report-filter"><span>Location</span><input value={location} onChange={(e) => { setLocation(e.target.value); resetPage(); }} placeholder="Filter by location" /></label>
        <label className="report-filter"><span>Submitted from</span><input type="date" value={submittedFrom} onChange={(e) => { setSubmittedFrom(e.target.value); resetPage(); }} /></label>
        <label className="report-filter"><span>Submitted to</span><input type="date" value={submittedTo} onChange={(e) => { setSubmittedTo(e.target.value); resetPage(); }} /></label>
        <label className="report-filter"><span>Sort</span><select value={sort} onChange={(e) => { setSort(e.target.value); resetPage(); }}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
      </section>
      {error && <div className="form-err" role="alert">{error}</div>}
      {loading ? <State>Loading pollution reports…</State> : !data?.total ? <div className="card report-empty"><ClipboardList size={34} /><h2>{status || pollutionType || location || search || submittedFrom || submittedTo ? 'No reports match these filters' : 'No pollution reports have been submitted'}</h2><p>New reports will appear here when users submit them.</p></div> : (
        <section className="card table-wrap report-table-wrap"><table className="report-table admin-report-table"><thead><tr><th>ID</th><th>Title</th><th>Submitted by</th><th>Pollution type</th><th>Location</th><th>Submitted</th><th>Incident</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{data.reports.map((report) => <tr key={report.id}><td>#{report.id}</td><td className="report-title-cell">{report.title}</td><td>{report.submitted_by}{report.submitter_email && <small className="table-subline">{report.submitter_email}</small>}</td><td>{report.pollution_type}</td><td>{report.location}</td><td>{fmtDateTime(report.created_at)}</td><td>{fmtDateTime(report.incident_at)}</td><td><span className={`report-status status-${report.status.toLowerCase().replace(/\s+/g, '-')}`}>{report.status}</span></td><td><button type="button" className="report-view-btn" onClick={() => void openDetails(report)} disabled={detailLoading}><Eye size={15} />View details</button></td></tr>)}</tbody>
        </table></section>
      )}
      {!!data?.total && <div className="report-pagination"><span>{data.total} report{data.total === 1 ? '' : 's'} · page {data.page} of {Math.max(1, data.pageCount)}</span><div><button className="icon-btn" aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => setPage((n) => Math.max(1, n - 1))}><ChevronLeft size={18} /></button><button className="icon-btn" aria-label="Next page" disabled={page >= data.pageCount || loading} onClick={() => setPage((n) => n + 1)}><ChevronRight size={18} /></button></div></div>}
      {selected && <PollutionReportDetails report={selected} admin onClose={() => setSelected(null)} onChanged={() => setRevision((n) => n + 1)} />}
    </>
  );
}
