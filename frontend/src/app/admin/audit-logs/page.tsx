'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { apiRequest } from '@/lib/api';
import { AuditLog } from '@/types';
import { 
  ClipboardList, 
  ArrowLeft, 
  RefreshCw, 
  ShieldCheck, 
  Clock 
} from 'lucide-react';

export default function AdminAuditLogsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<{ logs: AuditLog[] }>('/api/admin/audit-logs');
      setLogs(data.logs || []);
    } catch {
      // Handled gracefully
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
      fetchLogs();
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="app-container" style={{ padding: '3rem 0' }}>
        <div className="skeleton" style={{ height: '3rem', width: '40%', marginBottom: '2rem' }} />
        <div className="skeleton" style={{ height: '16rem', width: '100%' }} />
      </div>
    );
  }

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
          <h1 className="h1-title" style={{ marginBottom: '0.35rem' }}>System Audit Logs</h1>
          <p className="subtitle">Immutable trail of authentication events, appointment transitions, and operational records.</p>
        </div>
        <button onClick={fetchLogs} className="btn btn-secondary btn-sm">
          <RefreshCw size={14} /> Refresh Logs
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-secondary)' }}>
          No audit logs recorded yet.
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Initiated By</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const userName = log.userId?.name || 'System / Unauthenticated';
                const userEmail = log.userId?.email || '';

                return (
                  <tr key={log._id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.2rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.775rem',
                        fontWeight: 600,
                        letterSpacing: '0.03em',
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td>{log.resourceType}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{userName}</div>
                      {userEmail && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{userEmail}</div>}
                    </td>
                    <td style={{ maxWidth: '300px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
