'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { apiRequest } from '@/lib/api';
import { Appointment, QueueEntry } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import { 
  Calendar, 
  Clock, 
  User, 
  CheckCircle, 
  ArrowRight, 
  AlertCircle, 
  PlusCircle, 
  Stethoscope,
  Activity
} from 'lucide-react';

export default function PatientDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeQueue, setActiveQueue] = useState<QueueEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [apptRes, queueRes] = await Promise.allSettled([
        apiRequest<{ appointments: Appointment[] }>('/api/appointments'),
        apiRequest<{ entry: QueueEntry | null }>('/api/queue/my-status'),
      ]);

      if (apptRes.status === 'fulfilled' && apptRes.value.appointments) {
        setAppointments(apptRes.value.appointments);
      }
      if (queueRes.status === 'fulfilled' && queueRes.value.entry) {
        setActiveQueue(queueRes.value.entry);
      }
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
    if (user && user.role !== 'patient') {
      // Redirect staff to their respective consoles
      if (user.role === 'doctor') router.push('/doctor/dashboard');
      else if (user.role === 'receptionist') router.push('/receptionist/dashboard');
      else if (user.role === 'admin') router.push('/admin/dashboard');
      return;
    }

    if (user) {
      fetchData();
    }
  }, [user, authLoading]);

  const handleCheckIn = async (appointmentId: string) => {
    setActionLoading(appointmentId);
    setMessage(null);
    try {
      const data = await apiRequest<{ success: boolean; entry: QueueEntry; message: string }>('/api/queue/check-in', {
        method: 'POST',
        body: JSON.stringify({ appointmentId }),
      });
      setMessage({ text: data.message || 'Successfully checked in to the clinic queue.', type: 'success' });
      setActiveQueue(data.entry);
      fetchData();
    } catch (err: any) {
      setMessage({ text: err.message || 'Check-in failed. Please verify your appointment date.', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="app-container" style={{ padding: '3rem 0' }}>
        <div className="skeleton" style={{ height: '3rem', width: '40%', marginBottom: '2rem' }} />
        <div className="grid-cols-3" style={{ marginBottom: '2rem' }}>
          <div className="skeleton" style={{ height: '8rem' }} />
          <div className="skeleton" style={{ height: '8rem' }} />
          <div className="skeleton" style={{ height: '8rem' }} />
        </div>
      </div>
    );
  }

  const upcomingAppointments = appointments.filter(
    (a) => ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'].includes(a.status)
  );

  return (
    <div className="app-container">
      {/* Welcome Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="h1-title" style={{ marginBottom: '0.35rem' }}>Welcome back, {user?.name}</h1>
          <p className="subtitle">Manage your healthcare visits, check in upon arrival, and track your queue status.</p>
        </div>
        <Link href="/patient/book" className="btn btn-primary">
          <PlusCircle size={16} /> Book New Appointment
        </Link>
      </div>

      {message && (
        <div style={{
          backgroundColor: message.type === 'success' ? 'var(--status-in-progress-bg)' : 'var(--status-cancelled-bg)',
          border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
          color: message.type === 'success' ? 'var(--status-in-progress)' : 'var(--status-cancelled)',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.9rem',
        }}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Active Live Queue Banner if checked in */}
      {activeQueue && ['WAITING', 'CALLED', 'IN_CONSULTATION'].includes(activeQueue.status) && (
        <div className="card-elevated" style={{
          border: '1px solid var(--accent-border)',
          backgroundColor: 'rgba(2, 132, 199, 0.08)',
          marginBottom: '2.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
              width: '3.5rem',
              height: '3.5rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.4rem',
            }}>
              <span>#{activeQueue.queueNumber}</span>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>Live Queue Active</span>
                <StatusBadge status={activeQueue.status} />
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {activeQueue.patientsAhead !== undefined && activeQueue.patientsAhead > 0
                  ? `${activeQueue.patientsAhead} patient${activeQueue.patientsAhead > 1 ? 's' : ''} ahead of you`
                  : 'You are next in line!'}
                {activeQueue.estimatedWaitMinutes !== undefined && activeQueue.estimatedWaitMinutes > 0 && (
                  <span> &bull; Est. wait: ~{activeQueue.estimatedWaitMinutes} min</span>
                )}
              </p>
            </div>
          </div>
          <Link href="/patient/queue" className="btn btn-primary btn-sm">
            Open Queue Tracker <ArrowRight size={15} />
          </Link>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid-cols-3" style={{ marginBottom: '2.5rem' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Active Appointments</span>
            <Calendar size={18} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{upcomingAppointments.length}</div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Current Queue Status</span>
            <Clock size={18} style={{ color: 'var(--status-in-progress)' }} />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
            {activeQueue && ['WAITING', 'CALLED', 'IN_CONSULTATION'].includes(activeQueue.status)
              ? `Queue #${activeQueue.queueNumber}`
              : 'Not in Queue'}
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Clinic Doctors</span>
            <Stethoscope size={18} style={{ color: 'var(--status-confirmed)' }} />
          </div>
          <Link href="/doctors" style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.5rem' }}>
            Browse Directory <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Upcoming Appointments Table */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 className="h3-title">Upcoming Appointments</h2>
          <Link href="/patient/appointments" style={{ fontSize: '0.875rem', color: 'var(--accent-primary)' }}>
            View Full History
          </Link>
        </div>

        {upcomingAppointments.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
            <Calendar size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.35rem' }}>No Active Appointments</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              You don't have any scheduled appointments pending or confirmed.
            </p>
            <Link href="/patient/book" className="btn btn-primary btn-sm">
              Book an Appointment
            </Link>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Date & Time</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Queue / Action</th>
                </tr>
              </thead>
              <tbody>
                {upcomingAppointments.map((appt) => {
                  const doctorName = typeof appt.doctorId === 'object' && appt.doctorId ? (appt.doctorId as any).fullName : 'Doctor';
                  const isToday = appt.appointmentDate === new Date().toISOString().split('T')[0];
                  const canCheckIn = isToday && appt.status === 'CONFIRMED';

                  return (
                    <tr key={appt._id}>
                      <td style={{ fontWeight: 600 }}>{doctorName}</td>
                      <td>
                        <div>{appt.appointmentDate}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{appt.appointmentTime}</div>
                      </td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {appt.reason || 'General Consultation'}
                      </td>
                      <td>
                        <StatusBadge status={appt.status} />
                      </td>
                      <td>
                        {canCheckIn ? (
                          <button
                            onClick={() => handleCheckIn(appt._id)}
                            disabled={actionLoading === appt._id}
                            className="btn btn-primary btn-sm"
                          >
                            <Clock size={14} />
                            {actionLoading === appt._id ? 'Checking In...' : 'Check In'}
                          </button>
                        ) : appt.status === 'CHECKED_IN' ? (
                          <Link href="/patient/queue" className="btn btn-secondary btn-sm">
                            View Live Queue
                          </Link>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {appt.status === 'PENDING' ? 'Awaiting Doctor Review' : 'Scheduled'}
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
      </div>
    </div>
  );
}
