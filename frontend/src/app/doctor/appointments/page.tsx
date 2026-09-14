'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { apiRequest } from '@/lib/api';
import { Appointment } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import { 
  CheckCircle, 
  XCircle, 
  Calendar, 
  Clock, 
  ArrowLeft, 
  AlertCircle, 
  RefreshCw 
} from 'lucide-react';

export default function DoctorAppointmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<{ appointments: Appointment[] }>('/api/appointments');
      setAppointments(data.appointments || []);
    } catch {
      setMessage({ text: 'Failed to load appointments.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user && user.role !== 'doctor') {
      router.push('/');
      return;
    }
    if (user) {
      fetchAppointments();
    }
  }, [user, authLoading]);

  const handleConfirm = async (id: string) => {
    setActionLoading(id);
    setMessage(null);
    try {
      await apiRequest(`/api/appointments/${id}/confirm`, { method: 'PATCH' });
      setMessage({ text: 'Appointment confirmed successfully.', type: 'success' });
      fetchAppointments();
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to confirm appointment.', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectId) return;

    setActionLoading(rejectId);
    setMessage(null);
    try {
      await apiRequest(`/api/appointments/${rejectId}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: rejectReason || 'Doctor unavailable at this time' }),
      });
      setMessage({ text: 'Appointment declined.', type: 'success' });
      setRejectId(null);
      setRejectReason('');
      fetchAppointments();
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to decline appointment.', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = appointments.filter((a) => {
    if (filter === 'PENDING') return a.status === 'PENDING';
    if (filter === 'CONFIRMED') return ['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'].includes(a.status);
    if (filter === 'COMPLETED') return a.status === 'COMPLETED';
    if (filter === 'REJECTED') return ['REJECTED', 'CANCELLED', 'NO_SHOW'].includes(a.status);
    return true;
  });

  return (
    <div className="app-container" style={{ padding: '2rem 1.5rem' }}>
      <Link href="/doctor/dashboard" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontSize: '0.875rem',
        color: 'var(--text-secondary)',
        marginBottom: '1.5rem',
      }}>
        <ArrowLeft size={16} /> Back to Doctor Console
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="h1-title" style={{ marginBottom: '0.35rem' }}>Appointment Requests</h1>
          <p className="subtitle">Review booking requests, confirm patient slots, and review schedule history.</p>
        </div>
        <button onClick={fetchAppointments} className="btn btn-secondary btn-sm">
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
          marginBottom: '2rem',
          fontSize: '0.9rem',
        }}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        {[
          { key: 'PENDING', label: 'Pending Requests' },
          { key: 'CONFIRMED', label: 'Confirmed & Active' },
          { key: 'COMPLETED', label: 'Completed' },
          { key: 'REJECTED', label: 'Declined / Cancelled' },
          { key: 'ALL', label: 'All History' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`btn btn-sm ${filter === tab.key ? 'btn-primary' : 'btn-secondary'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: '16rem', width: '100%' }} />
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-secondary)' }}>
          No appointments in this category.
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Date & Time</th>
                <th>Consultation Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((appt) => {
                const patientName = typeof appt.patientId === 'object' && appt.patientId ? (appt.patientId as any).name : 'Patient';
                const patientEmail = typeof appt.patientId === 'object' && appt.patientId ? (appt.patientId as any).email : '';

                return (
                  <tr key={appt._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{patientName}</div>
                      {patientEmail && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{patientEmail}</div>}
                    </td>
                    <td>
                      <div>{appt.appointmentDate}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{appt.appointmentTime}</div>
                    </td>
                    <td style={{ maxWidth: '280px' }}>{appt.reason}</td>
                    <td><StatusBadge status={appt.status} /></td>
                    <td>
                      {appt.status === 'PENDING' ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleConfirm(appt._id)}
                            disabled={actionLoading === appt._id}
                            className="btn btn-primary btn-sm"
                          >
                            <CheckCircle size={14} /> Accept
                          </button>
                          <button
                            onClick={() => setRejectId(appt._id)}
                            disabled={actionLoading === appt._id}
                            className="btn btn-secondary btn-sm"
                            style={{ color: 'var(--status-cancelled)' }}
                          >
                            <XCircle size={14} /> Decline
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                          {appt.status === 'CONFIRMED' ? 'Ready for Check-In' : 'Processed'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Decline Reason Modal */}
      {rejectId && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          zIndex: 100,
        }}>
          <div className="card-elevated" style={{ maxWidth: '440px', width: '100%' }}>
            <h3 className="h3-title" style={{ marginBottom: '0.75rem' }}>Decline Appointment</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Provide a reason for declining this appointment request. The patient will be notified.
            </p>
            <form onSubmit={handleReject}>
              <div className="form-group">
                <label className="form-label" htmlFor="rejectReason">Reason for declining</label>
                <input
                  id="rejectReason"
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Schedule conflict, out of office..."
                  className="form-input"
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => { setRejectId(null); setRejectReason(''); }}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === rejectId}
                  className="btn btn-danger btn-sm"
                >
                  Confirm Decline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
