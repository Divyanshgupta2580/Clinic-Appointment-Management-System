'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { apiRequest } from '@/lib/api';
import { User, UserRole } from '@/types';
import { 
  Users, 
  ArrowLeft, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  ShieldCheck
} from 'lucide-react';

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<{ users: User[] }>('/api/admin/users');
      setUsers(data.users || []);
    } catch {
      setMessage({ text: 'Failed to load user records.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user && user.role !== 'admin') {
      router.push('/');
      return;
    }
    if (user) {
      fetchUsers();
    }
  }, [user, authLoading, router]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setRoleUpdatingId(userId);
    setMessage(null);
    try {
      await apiRequest(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      setMessage({ text: `User role updated to ${newRole}.`, type: 'success' });
      fetchUsers();
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to update user role.', type: 'error' });
    } finally {
      setRoleUpdatingId(null);
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.includes(q);
  });

  return (
    <div className="app-container" style={{ padding: '2rem 1.5rem' }}>
      <Link href="/admin/dashboard" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontSize: '0.875rem',
        color: 'var(--text-secondary)',
        marginBottom: '1.5rem',
      }}>
        <ArrowLeft size={16} /> Back to Admin Console
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="h1-title" style={{ marginBottom: '0.35rem' }}>User Management</h1>
          <p className="subtitle">Inspect registered clinic users, update role privileges, and review contact details.</p>
        </div>
        <button onClick={fetchUsers} className="btn btn-secondary btn-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {message && (
        <div style={{
          backgroundColor: message.type === 'success' ? 'var(--status-in-progress-bg)' : 'var(--status-cancelled-bg)',
          border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
          color: message.type === 'success' ? 'var(--status-in-progress)' : 'var(--status-cancelled)',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Search Input */}
      <div style={{ marginBottom: '1.5rem', position: 'relative', maxWidth: '400px' }}>
        <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Filter by name, email, or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input"
          style={{ paddingLeft: '2.5rem' }}
        />
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: '16rem', width: '100%' }} />
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-secondary)' }}>
          No user accounts found matching your search.
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Current Role</th>
                <th>Privilege Level</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u._id}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.phone || '-'}</td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.2rem 0.6rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-medium)',
                      color: u.role === 'admin' ? 'var(--status-pending)' : u.role === 'doctor' ? 'var(--accent-primary)' : 'inherit',
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <select
                      value={u.role}
                      disabled={roleUpdatingId === u._id}
                      onChange={(e) => handleRoleChange(u._id, e.target.value as UserRole)}
                      className="form-select"
                      style={{ width: '160px', padding: '0.35rem 0.65rem', fontSize: '0.825rem' }}
                    >
                      <option value="patient">Patient</option>
                      <option value="doctor">Doctor</option>
                      <option value="receptionist">Receptionist</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
