import { FormEvent, useEffect, useState } from 'react';
import { Bell, CheckCircle2, Clock, Building2, KeyRound, Link2, Server, UserCircle } from 'lucide-react';
import { AirData } from '../hooks/useAirData';
import { User, UserPreferences } from '../types/user';
import { changePassword, errMsg, getPreferences, savePreferences } from '../services/api';
import { fmtDateTime } from '../utils/aqi';

const TABS = ['Profile', 'Change Password', 'Preferences'];
const defaults: UserPreferences = { in_app_notifications: true, auto_refresh: true };

export default function Settings({ d, user }: { d: AirData; user: User }) {
  const [tab, setTab] = useState('Profile');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [preferences, setPreferences] = useState<UserPreferences>(defaults);
  const [preferenceBusy, setPreferenceBusy] = useState(false);
  const [preferenceMessage, setPreferenceMessage] = useState('');
  const [preferenceError, setPreferenceError] = useState('');
  const last = d.readings.length ? d.readings.reduce((a, r) => (r.recorded_at > a ? r.recorded_at : a), d.readings[0].recorded_at) : null;

  useEffect(() => {
    let active = true;
    void getPreferences().then((value) => { if (active) setPreferences(value); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault(); setPasswordMessage(''); setPasswordError('');
    if (newPassword.length < 8) { setPasswordError('Your new password must contain at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('The new password and confirmation do not match.'); return; }
    setPasswordBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordMessage('Your password has been changed.');
    } catch (error) { setPasswordError(errMsg(error, 'Could not change your password.')); }
    finally { setPasswordBusy(false); }
  };

  const submitPreferences = async (event: FormEvent) => {
    event.preventDefault(); setPreferenceMessage(''); setPreferenceError(''); setPreferenceBusy(true);
    try {
      const saved = await savePreferences(preferences);
      setPreferences(saved);
      localStorage.setItem('aw_auto_refresh', String(saved.auto_refresh));
      window.dispatchEvent(new Event('aw-preferences-changed'));
      setPreferenceMessage('Your preferences have been saved.');
    } catch (error) { setPreferenceError(errMsg(error, 'Could not save your preferences.')); }
    finally { setPreferenceBusy(false); }
  };

  return <>
    <div className="page-head"><div><h1>Settings</h1><p>Manage your account and application preferences</p></div></div>
    <div className="tabs">{TABS.map((item) => <button key={item} className={tab === item ? 'on' : ''} onClick={() => setTab(item)}>{item}</button>)}</div>
    {tab === 'Profile' && <div className="settings-grid">
      <div className="card"><h3>Profile Information</h3><UserCircle size={72} strokeWidth={1.2} className="ico-blue" />
        <label>Name<input readOnly value={user.username} /></label><label>Email<input readOnly value={user.email} /></label><label>Role<input readOnly value={user.role === 'admin' ? 'Administrator' : user.role} /></label>
      </div>
      <div className="card"><h3>System Information</h3><ul className="sys">
        <li><Server /><p><small>Backend Status</small><b className={d.online ? 'ok' : 'bad'}>{d.online ? 'Connected' : 'Offline'}</b></p></li>
        <li><Clock /><p><small>Last Updated</small><b>{last ? fmtDateTime(last) : '--'}</b></p></li>
        <li><Building2 /><p><small>Total Stations</small><b>{d.stations.length}</b></p></li>
        <li><Link2 /><p><small>Application Version</small><b>v1.0.0</b></p></li>
      </ul></div>
    </div>}
    {tab === 'Change Password' && <form className="card account-form" onSubmit={submitPassword}>
      <div className="settings-form-title"><KeyRound /><div><h3>Change Password</h3><p>Use at least 8 characters for your new password.</p></div></div>
      <label>Current password<input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required /></label>
      <label>New password<input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={8} required /></label>
      <label>Confirm new password<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} required /></label>
      {passwordError && <div className="form-err" role="alert">{passwordError}</div>}{passwordMessage && <div className="form-note" role="status"><CheckCircle2 size={17} />{passwordMessage}</div>}
      <button className="btn green" disabled={passwordBusy}>{passwordBusy ? 'Saving...' : 'Change Password'}</button>
    </form>}
    {tab === 'Preferences' && <form className="card account-form" onSubmit={submitPreferences}>
      <div className="settings-form-title"><Bell /><div><h3>Preferences</h3><p>These settings apply to your account on this device.</p></div></div>
      <label className="preference-row"><input type="checkbox" checked={preferences.in_app_notifications} onChange={(event) => setPreferences((value) => ({ ...value, in_app_notifications: event.target.checked }))} /><span><b>In-app notifications</b><small>Show new report and account updates in the notification bell.</small></span></label>
      <label className="preference-row"><input type="checkbox" checked={preferences.auto_refresh} onChange={(event) => setPreferences((value) => ({ ...value, auto_refresh: event.target.checked }))} /><span><b>Automatic data refresh</b><small>Refresh station readings every minute while the app is open.</small></span></label>
      {preferenceError && <div className="form-err" role="alert">{preferenceError}</div>}{preferenceMessage && <div className="form-note" role="status"><CheckCircle2 size={17} />{preferenceMessage}</div>}
      <button className="btn green" disabled={preferenceBusy}>{preferenceBusy ? 'Saving...' : 'Save Preferences'}</button>
    </form>}
  </>;
}
