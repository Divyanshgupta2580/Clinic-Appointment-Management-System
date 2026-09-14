'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { apiRequest } from '@/lib/api';
import { Appointment } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import { 
  Calendar, 
  Clock, 
  ArrowLeft, 
  PlusCircle, 
  AlertCircle, 
  XCircle, 
  CheckCircle2,
  Stethoscope
} from 'lucide-react';

export default function PatientAppointmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<{ appointments: Appointment[] }>('/api/appointments');
      setAppointments(data.appointments || []);
    } catch {
      setError('Unable to load your appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchAppointments();
    }
  }, [user, authLoading]);

  const handleCancelAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingId) return;

    setActionLoading(true);
    setError(null);
    try {
      await apiRequest(`/api/appointments/${cancellingId}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: cancelReason || 'Patient cancelled via portal' }),
      });
      setCancellingId(null);
      setCancelReason('');
      fetchAppointments();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel appointment.');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = appointments.filter((a) => {
    if (filter === 'UPCOMING') return ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'].includes(a.status);
    if (filter === 'COMPLETED') return a.status === 'COMPLETED';
    if (filter === 'CANCELLED') return ['CANCELLED', 'REJECTED', 'NO_SHOW'].includes(a.status);
    return true;
  });

  return (
    <div className="app-container" style={{ padding: '2rem 1.5rem' }}>
      <Link href="/patient/dashboard" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontSize: '0.875rem',
        color: 'var(--text-secondary)',
        marginBottom: '1.5rem',
      }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="h1-title" style={{ marginBottom: '0.35rem' }}>My Appointments</h1>
          <p className="subtitle">View upcoming consultations, past visit history, and current scheduling status.</p>
        </div>
        <Link href="/patient/book" className="btn btn-primary">
          <PlusCircle size={16} /> Book Appointment
        </Link>
      </div>

      {error && (
        <div style={{
          backgroundColor: 'var(--status-cancelled-bg)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          color: 'var(--status-cancelled)',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        {[
          { key: 'ALL', label: 'All Appointments' },
          { key: 'UPCOMING', label: 'Upcoming / Active' },
          { key: 'COMPLETED', label: 'Completed' },
          { key: 'CANCELLED', label: 'Cancelled & Declined' },
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
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <Calendar size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.35rem' }}>No Appointments Found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            No records matched your selected filter category.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Date</th>
                <th>Time</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((appt) => {
                const doctorName = typeof appt.doctorId === 'object' && appt.doctorId ? (appt.doctorId as any).fullName : 'Doctor';
                const specialization = typeof appt.doctorId === 'object' && appt.doctorId ? (appt.doctorId as any).specialization : '';
                const canCancel = ['PENDING', 'CONFIRMED'].includes(appt.status);

                return (
                  <tr key={appt._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{doctorName}</div>
                      {specialization && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{specialization}</div>
                      )}
                    </td>
                    <td>{appt.appointmentDate}</td>
                    <td>{appt.appointmentTime}</td>
                    <td style={{ maxWidth: '240px' }}>{appt.reason}</td>
                    <td>
                      <StatusBadge status={appt.status} />
                    </td>
                    <td>
                      {canCancel && (
                        <button
                          onClick={() => setCancellingId(appt._id)}
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--status-cancelled)' }}
                        >
                          <XCircle size={14} /> Cancel
                        </button>
                      )}
                      {appt.status === 'CHECKED_IN' && (
                        <Link href="/patient/queue" className="btn btn-secondary btn-sm">
                          Live Queue
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancellingId && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          zIndex: 100,
        }}>
          <div className="card-elevated" style={{ maxWidth: '440px', width: '100%' }}>
            <h3 className="h3-title" style={{ marginBottom: '0.75rem' }}>Cancel Appointment</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Are you sure you wish to cancel this appointment slot? This action cannot be undone.
            </p>
            <form onSubmit={handleCancelAppointment}>
              <div className="form-group">
                <label className="form-label" htmlFor="cancelReason">Reason for cancellation (optional)</label>
                <input
                  id="cancelReason"
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Schedule conflict, feeling better..."
                  className="form-input"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => { setCancellingId(null); setCancelReason(''); }}
                  className="btn btn-secondary btn-sm"
                >
                  Keep Appointment
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-danger btn-sm"
                >
                  {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
