import { FormEvent, useCallback, useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, UserRound, ShieldCheck } from 'lucide-react';
import { clearSession, login, register, resetPassword, errMsg } from '../services/api';
import { User } from '../types/user';

export default function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [id, setId] = useState(''); const [pw, setPw] = useState('');
  const [show, setShow] = useState(false); const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const [email, setEmail] = useState(''); const [registerMode, setRegisterMode] = useState(false);
  const [resetMode, setResetMode] = useState(false); const [confirmPassword, setConfirmPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [accountType, setAccountType] = useState<'user' | 'admin'>('user');

  const finishLogin = useCallback((user: User) => {
    if (user.role.toLowerCase() !== accountType) {
      clearSession();
      setErr(accountType === 'admin'
        ? 'This account does not have administrator access. Choose User Login or contact your administrator.'
        : 'This is an administrator account. Choose Admin Login to continue.');
      return;
    }
    onLogin(user);
  }, [accountType, onLogin]);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(''); setNotice(''); setBusy(true);
    try {
      if (resetMode) {
        if (pw.length < 8) throw new Error('Your new password must contain at least 8 characters.');
        if (pw !== confirmPassword) throw new Error('The new password and confirmation do not match.');
        await resetPassword(id.trim(), email.trim(), pw);
        setPw(''); setConfirmPassword(''); setResetMode(false); setNotice('Password reset successfully. You can now sign in.');
      } else if (registerMode) {
        await register(id.trim(), email.trim(), pw);
        setRegisterMode(false); setErr('Account created. Sign in with your new credentials.');
      } else {
        const user = await login(id.trim(), pw, remember);
        finishLogin(user);
      }
    }
    catch (x) { setErr(x instanceof Error && !('response' in x) ? x.message : errMsg(x, 'Could not sign in. Check your details and that the server is running.')); }
    finally { setBusy(false); }
  };

  return (
    <div className="login">
      <header className="login-brand">
        <h2>Urban Air Quality<br /><span>Monitoring System</span></h2>
        <i />
      </header>
      <section className="login-aqi-decoration" aria-hidden="true">
        <span>AQI</span><b>--</b><small>Chennai monitoring network</small>
        <svg viewBox="0 0 150 54" preserveAspectRatio="none"><path d="M2 43 C20 44 20 29 36 34 S57 41 70 24 S93 37 107 21 S127 2 139 18 S145 28 150 17" /></svg>
      </section>
      <section className="login-pollutants" aria-hidden="true">
        {[['PM2.5', '#1ea6ff'], ['NO₂', '#a068ff'], ['PM10', '#ffae28'], ['SO₂', '#22d1d2']].map(([name, color]) => <div className="login-pollutant" key={name}>
          <div><span>{name}</span><b>--</b><small>μg/m³</small></div>
          <svg viewBox="0 0 90 42" style={{ color }}><path d="M2 34 C13 34 12 24 23 27 S33 30 42 17 S53 28 62 14 S75 3 82 16 S87 20 90 11" /></svg>
        </div>)}
      </section>
      <form className="login-card" onSubmit={submit}>
        {registerMode && <h1>Create Account</h1>}{resetMode && <h1>Reset Password</h1>}
        {!registerMode && !resetMode && <div className="login-modes" role="tablist" aria-label="Choose account type">
          <button type="button" role="tab" aria-selected={accountType === 'user'} className={accountType === 'user' ? 'active' : ''} onClick={() => { setAccountType('user'); setErr(''); }}><UserRound size={20} />User Login</button>
          <button type="button" role="tab" aria-selected={accountType === 'admin'} className={accountType === 'admin' ? 'active' : ''} onClick={() => { setAccountType('admin'); setRegisterMode(false); setErr(''); }}><ShieldCheck size={20} />Admin Login</button>
        </div>}
        {registerMode && <p>Create a user account for AirWatch</p>}{resetMode && <p>Enter your username and registered email to set a new password.</p>}
        <label className="field"><Mail size={20} /><input placeholder="Username" value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" required /></label>
        {(registerMode || resetMode) && <label className="field"><Mail size={20} /><input placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>}
        <label className="field"><Lock size={20} />
          <input placeholder={resetMode ? 'New password' : 'Password'} type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={resetMode ? 'new-password' : 'current-password'} required />
          <button type="button" className="eye" onClick={() => setShow(!show)} aria-label="Show password">{show ? <EyeOff size={20} /> : <Eye size={20} />}</button>
        </label>
        {resetMode && <label className="field"><Lock size={20} /><input placeholder="Confirm new password" type={show ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" required /></label>}
        {!resetMode && <div className="row-between">
          <label className="check"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />Remember me</label>
          {!registerMode && <button type="button" className="text-link" onClick={() => { setResetMode(true); setErr(''); setNotice(''); }}>Forgot password?</button>}
        </div>}
        {err && <div className="form-err" role="alert">{err}</div>}{notice && <div className="form-note" role="status">{notice}</div>}
        <button className="btn login-btn" disabled={busy}>{busy ? (registerMode ? 'Creating account...' : resetMode ? 'Resetting password...' : 'Signing in...') : <>{registerMode ? 'Create Account' : resetMode ? 'Reset Password' : 'Login'} <ArrowRight size={18} /></>}</button>
        {accountType === 'user' && !resetMode && <button type="button" className="text-link account-toggle" onClick={() => { setRegisterMode((v) => !v); setErr(''); setNotice(''); }}>{registerMode ? 'Already have an account? Sign in' : <>Don’t have an account? <u>Create an account</u></>}</button>}
        {resetMode && <button type="button" className="text-link account-toggle" onClick={() => { setResetMode(false); setErr(''); }}>Back to sign in</button>}
      </form>
    </div>
  );
}
