import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, Camera, CheckCircle2, Crosshair, LoaderCircle, MapPin, Phone, Send, X } from 'lucide-react';
import { State } from '../components/Bits';
import { submitPollutionReport, reverseGeocodeLocation, errMsg } from '../services/api';
import { POLLUTION_TYPES } from '../types/pollutionReport';

const localDateTime = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

export default function ReportPollution() {
  const [form, setForm] = useState({ title: '', pollution_type: '', location: '', mobile_number: '', description: '', incident_at: '', latitude: null as number | null, longitude: null as number | null });
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [locating, setLocating] = useState(false);

  const validMobile = (value: string) => /^[6-9]\d{9}$/.test(value.trim());
  const setManualLocation = (location: string) => setForm((current) => ({ ...current, location, latitude: null, longitude: null }));

  useEffect(() => {
    if (!image) { setPreview(''); return; }
    const url = URL.createObjectURL(image); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const chooseImage = (event: ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = event.target.files?.[0] ?? null;
    if (!file) { setImage(null); return; }
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) { setError('Choose a JPEG, PNG, or WebP image.'); event.target.value = ''; return; }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be 5 MB or smaller.'); event.target.value = ''; return; }
    setImage(file);
  };

  const useLiveLocation = () => {
    setError(''); setSuccess('');
    if (!navigator.geolocation) { setError('Live location is unavailable in this browser. Enter the incident location manually.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const resolved = await reverseGeocodeLocation(position.coords.latitude, position.coords.longitude);
          setForm((current) => ({ ...current, location: resolved.address, latitude: resolved.latitude, longitude: resolved.longitude }));
        } catch (locationError) { setError(errMsg(locationError, 'Could not resolve your location. Enter the incident location manually.')); }
        finally { setLocating(false); }
      },
      (locationError) => {
        const message = locationError.code === locationError.PERMISSION_DENIED
          ? 'Location permission was denied. Enter the incident location manually.'
          : locationError.code === locationError.POSITION_UNAVAILABLE
            ? 'Location services are unavailable. Enter the incident location manually.'
            : locationError.code === locationError.TIMEOUT
              ? 'Location request timed out. Enter the incident location manually.'
              : 'Could not obtain your live location. Enter the incident location manually.';
        setError(message); setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setSuccess('');
    const mobileNumber = form.mobile_number.trim();
    if (!validMobile(mobileNumber)) { const message = 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.'; setMobileError(message); setError(message); return; }
    if (form.description.trim().length < 20) { setError('Description must be at least 20 characters.'); return; }
    if (!form.incident_at || new Date(form.incident_at).getTime() > Date.now()) { setError('Choose a valid incident date and time that is not in the future.'); return; }
    setBusy(true);
    const body = new FormData();
    body.append('title', form.title.trim()); body.append('pollution_type', form.pollution_type);
    body.append('location', form.location.trim()); body.append('mobile_number', mobileNumber); body.append('description', form.description.trim());
    body.append('incident_at', new Date(form.incident_at).toISOString());
    if (form.latitude !== null && form.longitude !== null) { body.append('latitude', String(form.latitude)); body.append('longitude', String(form.longitude)); }
    if (image) body.append('image', image);
    try {
      await submitPollutionReport(body);
      setForm({ title: '', pollution_type: '', location: '', mobile_number: '', description: '', incident_at: '', latitude: null, longitude: null }); setImage(null); setMobileError('');
      setSuccess('Your pollution report was submitted. Its status is Pending.');
    } catch (e) { setError(errMsg(e, 'The report could not be submitted. Please try again.')); }
    finally { setBusy(false); }
  };

  return (
    <>
      <div className="page-head"><div><h1>Report Pollution</h1><p>Share an observed pollution incident with the AirWatch administrator.</p></div></div>
      <div className="report-notice"><AlertTriangle size={19} /><p>Reports are submitted for administrator review. Submission does not mean the incident has been independently verified.</p></div>
      {success && <div className="report-success" role="status"><CheckCircle2 size={18} />{success} <a href="#my-reports">View my reports</a></div>}
      <form className="card pollution-form" onSubmit={submit}>
        <div className="report-form-heading"><span><AlertTriangle size={19} /></span><div><h2>Pollution incident details</h2><p>Fields marked with * are required.</p></div></div>
        <div className="report-form-grid">
          <label className="report-label">Report title *<input required maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Heavy smoke near residential area" /></label>
          <label className="report-label">Pollution type *<select required value={form.pollution_type} onChange={(e) => setForm({ ...form, pollution_type: e.target.value })}><option value="" disabled>Select pollution type</option>{POLLUTION_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label className="report-label report-span-2">Incident location *<span className="input-icon-wrap"><MapPin size={17} /><input required maxLength={200} value={form.location} onChange={(e) => setManualLocation(e.target.value)} placeholder="Area or locality, Chennai" /></span>
            <span className="location-helper"><small>Use your current location only if the incident occurred there. You can edit the address before submitting.</small><button type="button" className="btn subtle live-location-btn" disabled={locating} onClick={useLiveLocation}>{locating ? <LoaderCircle className="spin" size={16} /> : <Crosshair size={16} />}{locating ? 'Finding location…' : 'Use My Live Location'}</button></span>
            {form.latitude !== null && form.longitude !== null && <small className="location-ready">Current location coordinates attached. Editing the address will remove them.</small>}
          </label>
          <label className="report-label report-span-2">Mobile Number *<span className="input-icon-wrap"><Phone size={17} /><input required inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} value={form.mobile_number} onChange={(e) => { const value = e.target.value.replace(/\D/g, '').slice(0, 10); setForm({ ...form, mobile_number: value }); if (mobileError) setMobileError(validMobile(value) ? '' : 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.'); }} onBlur={() => { if (form.mobile_number && !validMobile(form.mobile_number)) setMobileError('Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.'); }} placeholder="Enter 10-digit mobile number" /></span>{mobileError && <small className="field-error" role="alert">{mobileError}</small>}</label>
          <label className="report-label report-span-2">Description *<textarea required minLength={20} maxLength={2000} rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe what you observed, where it came from if known, and any relevant details." /><small>{form.description.length}/2000 characters · minimum 20</small></label>
          <label className="report-label">Incident date and time *<span className="input-icon-wrap"><CalendarClock size={17} /><input type="datetime-local" required max={localDateTime()} value={form.incident_at} onChange={(e) => setForm({ ...form, incident_at: e.target.value })} /></span></label>
          <label className="report-label">Photo evidence (optional)<span className="upload-field"><Camera size={18} /><input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} /><small>JPEG, PNG, or WebP · up to 5 MB</small></span></label>
          {preview && <div className="report-image-preview"><img src={preview} alt="Selected pollution incident evidence preview" /><button type="button" className="btn subtle" onClick={() => setImage(null)}><X size={16} />Remove image</button></div>}
        </div>
        {error && <div className="form-err" role="alert">{error}</div>}
        <div className="report-form-footer"><p>Your report will be associated with your signed-in account.</p><button className="btn green" disabled={busy}>{busy ? 'Submitting…' : 'Submit report'} <Send size={16} /></button></div>
      </form>
      <State>Submitted reports appear in My Reports, where you can follow their status and administrator remarks.</State>
    </>
  );
}
