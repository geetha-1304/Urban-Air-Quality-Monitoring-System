import { useEffect, useState } from 'react';
import { UsersRound, ShieldCheck, UserRound } from 'lucide-react';
import { getUsers, errMsg } from '../services/api';
import { User } from '../types/user';
import { State } from '../components/Bits';

const joined = (date: string) => new Date(date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getUsers().then((rows) => { if (active) setUsers(rows); })
      .catch((e) => { if (active) setError(errMsg(e, 'Could not load registered users.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const admins = users.filter((user) => user.role === 'admin').length;
  return (
    <>
      <div className="page-head"><div><h1>Registered Users</h1><p>View every account registered for the AirWatch system.</p></div></div>
      {loading ? <State>Loading registered users…</State> : error ? <State error>{error}</State> : <>
        <section className="user-summary" aria-label="User summary">
          <article className="user-stat"><UsersRound size={21} /><div><small>Total users</small><b>{users.length}</b></div></article>
          <article className="user-stat"><ShieldCheck size={21} /><div><small>Administrators</small><b>{admins}</b></div></article>
          <article className="user-stat"><UserRound size={21} /><div><small>Regular users</small><b>{users.length - admins}</b></div></article>
        </section>
        <section className="card table-wrap users-table-wrap"><table className="users-table"><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead><tbody>
          {users.map((user) => <tr key={user.id}><td><b>{user.username}</b></td><td>{user.email}</td><td><span className={`role-badge ${user.role === 'admin' ? 'admin' : ''}`}>{user.role === 'admin' ? 'Administrator' : 'User'}</span></td><td>{user.created_at ? joined(user.created_at) : '—'}</td></tr>)}
        </tbody></table></section>
      </>}
    </>
  );
}
