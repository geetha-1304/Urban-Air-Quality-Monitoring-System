import { useEffect, useState } from 'react';
import { Check, ExternalLink, X } from 'lucide-react';
import { PollutionReport, PollutionReportStatus } from '../types/pollutionReport';
import { errMsg, fetchPollutionReportImage, getAdminPollutionReport, getMyPollutionReport, savePollutionReportRemarks, setPollutionReportStatus } from '../services/api';
import { fmtDateTime } from '../utils/aqi';

export default function PollutionReportDetails({ report: initial, admin = false, onClose, onChanged }: {
  report: PollutionReport; admin?: boolean; onClose: () => void; onChanged?: () => void;
}) {
  const [report, setReport] = useState(initial);
  const [imageUrl, setImageUrl] = useState('');
  const [imageError, setImageError] = useState('');
  const [note, setNote] = useState('');
  const [remarks, setRemarks] = useState(initial.admin_remarks ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [nextStatus, setNextStatus] = useState<PollutionReportStatus | ''>('');

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    if (report.image_url) {
      fetchPollutionReportImage(report.id).then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      }).catch(() => { if (active) setImageError('The evidence image could not be loaded.'); });
    }
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [report.id, report.image_url]);

  const updateStatus = async (status: PollutionReportStatus) => {
    setError(''); setSaved('');
    if (status === 'Rejected' && !note.trim()) { setError('Enter a rejection reason before rejecting this report.'); return; }
    if (note.trim().length > 2000) { setError('Remarks must be 2000 characters or fewer.'); return; }
    if (!window.confirm(`Change report #${report.id} from ${report.status} to ${status}?`)) return;
    setBusy(true);
    try {
      await setPollutionReportStatus(report.id, status, note.trim() || undefined);
      const refreshed = admin ? await getAdminPollutionReport(report.id) : await getMyPollutionReport(report.id);
      setReport(refreshed); setRemarks(refreshed.admin_remarks ?? ''); setSaved(`Report marked ${status}.`); setNote(''); setNextStatus(''); onChanged?.();
    } catch (e) { setError(errMsg(e, 'Could not update the report status.')); }
    finally { setBusy(false); }
  };

  const saveRemarks = async () => {
    setError(''); setSaved('');
    if (!remarks.trim()) { setError('Enter administrator remarks before saving.'); return; }
    if (remarks.trim().length > 2000) { setError('Remarks must be 2000 characters or fewer.'); return; }
    if (!window.confirm('Save administrator remarks for this report?')) return;
    setBusy(true);
    try {
      await savePollutionReportRemarks(report.id, remarks.trim());
      const refreshed = await getAdminPollutionReport(report.id);
      setReport(refreshed); setRemarks(refreshed.admin_remarks ?? ''); setSaved('Administrator remarks saved.'); onChanged?.();
    }
    catch (e) { setError(errMsg(e, 'Could not save remarks.')); }
    finally { setBusy(false); }
  };

  const nextStatuses: PollutionReportStatus[] = report.status === 'Pending'
    ? ['Under Review', 'Resolved', 'Rejected']
    : report.status === 'Under Review' ? ['Resolved', 'Rejected'] : [];

  return (
    <div className="overlay report-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal report-detail-modal" role="dialog" aria-modal="true" aria-labelledby="report-detail-title">
        <div className="card-head"><div><small>Pollution report #{report.id}</small><h2 id="report-detail-title">{report.title}</h2></div>
          <button type="button" className="icon-btn" aria-label="Close report details" onClick={onClose}><X size={20} /></button></div>
        <div className="report-detail-grid">
          <div><small>Pollution type</small><b>{report.pollution_type}</b></div>
          <div><small>Location</small><b>{report.location}</b></div>
          <div><small>Mobile number</small><b>{report.mobile_number ?? 'Not provided'}</b></div>
          {(report.latitude !== null && report.longitude !== null) && <div><small>Selected location coordinates</small><b>{report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}</b></div>}
          <div><small>Submitted by</small><b>{report.submitted_by ?? 'You'}</b>{admin && report.submitter_email && <small>{report.submitter_email}</small>}</div>
          <div><small>Status</small><span className={`report-status status-${report.status.toLowerCase().replace(/\s+/g, '-')}`}>{report.status}</span></div>
          <div><small>Submitted</small><b>{fmtDateTime(report.created_at)}</b></div>
          <div><small>Incident time</small><b>{fmtDateTime(report.incident_at)}</b></div>
        </div>
        <div className="report-description"><small>Description</small><p>{report.description}</p></div>
        {report.image_url && <div className="report-evidence"><small>Uploaded evidence</small>
          {imageUrl ? <a href={imageUrl} target="_blank" rel="noreferrer"><img src={imageUrl} alt={`Evidence for ${report.title}`} /><span><ExternalLink size={14} /> Open image</span></a> : <p>{imageError || 'Loading image…'}</p>}
        </div>}
        <div className="report-remarks"><small>Administrator remarks</small><p>{report.admin_remarks || 'No administrator remarks yet.'}</p></div>
        {!!report.history?.length && <div className="report-history"><h3>Status and activity history</h3>
          {report.history.map((entry) => <div key={entry.id} className="history-row"><span className="history-dot" />
            <div><b>{entry.action === 'submitted' ? 'Submitted' : entry.action === 'remarks_updated' ? 'Remarks updated' : `${entry.previous_status} → ${entry.new_status}`}</b>
              <small>{fmtDateTime(entry.created_at)}{entry.admin_username ? ` · ${entry.admin_username}` : ''}</small>{entry.remarks && <p>{entry.remarks}</p>}</div>
          </div>)}
        </div>}
        {admin && <div className="admin-report-actions">
          {!!nextStatuses.length && <div className="admin-action-block"><h3>Update status</h3>
            <div className="admin-action-row"><select className="field-control" value={nextStatus} onChange={(e) => setNextStatus(e.target.value as PollutionReportStatus | '')} aria-label="Choose next report status"><option value="" disabled>Choose status</option>{nextStatuses.map((s) => <option key={s} value={s}>{s}</option>)}</select>
              <button type="button" className="btn primary" disabled={busy || !nextStatus} onClick={() => { if (nextStatus) void updateStatus(nextStatus); }}>Update status</button></div>
            <label className="report-label">{nextStatus === 'Rejected' ? 'Rejection reason (required)' : 'Resolution remarks (optional)'}
              <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} rows={3} placeholder="Add a note for the report owner" /></label>
          </div>}
          <div className="admin-action-block"><h3>Add or update remarks</h3><label className="report-label"><span className="sr-only">Administrator remarks</span>
            <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} maxLength={2000} rows={3} placeholder="Write remarks visible to the report owner" /></label>
            <button type="button" className="btn green" disabled={busy} onClick={() => void saveRemarks()}><Check size={16} />Save remarks</button>
          </div>
        </div>}
        {error && <div className="form-err" role="alert">{error}</div>}{saved && <div className="report-success" role="status">{saved}</div>}
      </section>
    </div>
  );
}
