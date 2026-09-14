'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { apiRequest } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { QueueEntry, Appointment } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import { 
  Clock, 
  User, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  MapPin, 
  ArrowLeft, 
  Radio, 
  RefreshCw,
  Bell
} from 'lucide-react';

export default function PatientLiveQueuePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [queueEntry, setQueueEntry] = useState<QueueEntry | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [delayNotice, setDelayNotice] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [socketConnected, setSocketConnected] = useState(false);

  const fetchQueueStatus = useCallback(async () => {
    try {
      const data = await apiRequest<{ entry: QueueEntry | null }>('/api/queue/my-status');
      setQueueEntry(data.entry || null);
      if (data.entry?.delayNotice) {
        setDelayNotice(data.entry.delayNotice);
      }
      setLastUpdated(new Date());
    } catch {
      // Handled gracefully
    }
  }, []);

  const fetchEligibleAppointments = useCallback(async () => {
    try {
      const data = await apiRequest<{ appointments: Appointment[] }>('/api/appointments');
      const todayStr = new Date().toISOString().split('T')[0];
      const eligible = (data.appointments || []).filter(
        (a) => a.appointmentDate === todayStr && a.status === 'CONFIRMED'
      );
      setTodayAppointments(eligible);
    } catch {
      // Handled gracefully
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      Promise.all([fetchQueueStatus(), fetchEligibleAppointments()]).finally(() => {
        setLoading(false);
      });

      // Set up real-time Socket.IO events
      const socket = getSocket();
      if (socket) {
        setSocketConnected(socket.connected);

        const onConnect = () => setSocketConnected(true);
        const onDisconnect = () => setSocketConnected(false);

        const onQueueUpdate = () => {
          fetchQueueStatus();
        };

        const onQueueDelayed = (data: any) => {
          if (data?.notice) {
            setDelayNotice(data.notice);
          }
          fetchQueueStatus();
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('queue_updated', onQueueUpdate);
        socket.on('patient_checked_in', onQueueUpdate);
        socket.on('consultation_started', onQueueUpdate);
        socket.on('consultation_completed', onQueueUpdate);
        socket.on('queue_delayed', onQueueDelayed);

        // Fallback refresh interval every 30 seconds
        const interval = setInterval(fetchQueueStatus, 30000);

        return () => {
          socket.off('connect', onConnect);
          socket.off('disconnect', onDisconnect);
          socket.off('queue_updated', onQueueUpdate);
          socket.off('patient_checked_in', onQueueUpdate);
          socket.off('consultation_started', onQueueUpdate);
          socket.off('consultation_completed', onQueueUpdate);
          socket.off('queue_delayed', onQueueDelayed);
          clearInterval(interval);
        };
      }
    }
  }, [user, authLoading, fetchQueueStatus, fetchEligibleAppointments, router]);

  const handleCheckIn = async (appointmentId: string) => {
    setCheckingIn(appointmentId);
    try {
      const data = await apiRequest<{ success: boolean; entry: QueueEntry }>('/api/queue/check-in', {
        method: 'POST',
        body: JSON.stringify({ appointmentId }),
      });
      setQueueEntry(data.entry);
      fetchEligibleAppointments();
    } catch (err: any) {
      alert(err.message || 'Check-in failed. Please visit the clinic reception desk.');
    } finally {
      setCheckingIn(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="app-container" style={{ padding: '3rem 0', maxWidth: '720px' }}>
        <div className="skeleton" style={{ height: '3rem', width: '60%', marginBottom: '2rem' }} />
        <div className="skeleton" style={{ height: '16rem', width: '100%' }} />
      </div>
    );
  }

  return (
    <div className="app-container" style={{ maxWidth: '760px', padding: '2rem 1.5rem' }}>
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

      {/* Header with live indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="h1-title" style={{ marginBottom: '0.25rem' }}>Live Clinic Queue</h1>
          <p className="subtitle">Real-time waiting queue status and position tracker</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div className="live-indicator">
            <span className="live-dot" />
            <span>{socketConnected ? 'Live Connection' : 'Polling Active'}</span>
          </div>
          <button
            onClick={() => { fetchQueueStatus(); fetchEligibleAppointments(); }}
            className="btn btn-secondary btn-sm"
            title="Refresh queue status"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Delay Notice Banner if active */}
      {delayNotice && (
        <div style={{
          backgroundColor: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          color: 'var(--status-pending)',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          fontSize: '0.9rem',
        }}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '0.15rem' }} />
          <div>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Clinical Delay Notice</div>
            <p style={{ color: 'var(--text-primary)' }}>{delayNotice}</p>
          </div>
        </div>
      )}

      {/* Main Queue Card if checked in */}
      {queueEntry && ['WAITING', 'CALLED', 'IN_CONSULTATION'].includes(queueEntry.status) ? (
        <div className="card-elevated" style={{
          border: '1px solid var(--accent-border)',
          backgroundColor: 'var(--bg-surface-elevated)',
          marginBottom: '2rem',
          padding: '2rem',
        }}>
          {/* Status Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Radio size={18} style={{ color: 'var(--accent-primary)' }} />
              <span style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                Your Clinic Token
              </span>
            </div>
            <StatusBadge status={queueEntry.status} />
          </div>

          {/* Token Display */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem 1rem',
            backgroundColor: 'var(--bg-base)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-medium)',
            marginBottom: '2rem',
          }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
              Queue Number
            </div>
            <div style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--accent-primary)', lineHeight: 1 }}>
              #{queueEntry.queueNumber}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Check-In Time: {queueEntry.checkInTime || 'Today'}
            </div>
          </div>

          {/* Key Queue Metrics */}
          <div className="grid-cols-2" style={{ marginBottom: '2rem' }}>
            <div style={{
              padding: '1.25rem',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Patients Ahead of You
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                {queueEntry.patientsAhead !== undefined && queueEntry.patientsAhead > 0
                  ? queueEntry.patientsAhead
                  : 'None (Next in Line)'}
              </div>
            </div>

            <div style={{
              padding: '1.25rem',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Estimated Wait Time
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--status-confirmed)' }}>
                {queueEntry.estimatedWaitMinutes !== undefined && queueEntry.estimatedWaitMinutes > 0
                  ? `~${queueEntry.estimatedWaitMinutes} mins`
                  : 'Ready for Call'}
              </div>
            </div>
          </div>

          {/* Consultation Room info */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.9rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={18} style={{ color: 'var(--accent-primary)' }} />
              <span>Assigned Room: <strong>{queueEntry.roomNumber || 'Consultation Room'}</strong></span>
            </div>
            {queueEntry.doctorName && (
              <div style={{ color: 'var(--text-secondary)' }}>
                Doctor: <strong>{queueEntry.doctorName}</strong>
              </div>
            )}
          </div>
        </div>
      ) : queueEntry && queueEntry.status === 'COMPLETED' ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', marginBottom: '2rem' }}>
          <CheckCircle2 size={40} style={{ color: 'var(--status-completed)', margin: '0 auto 1rem' }} />
          <h2 className="h3-title" style={{ marginBottom: '0.5rem' }}>Consultation Completed</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
            Your consultation today has concluded. Thank you for visiting MediPulse Clinic.
          </p>
        </div>
      ) : (
        /* Not currently checked in */
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', marginBottom: '2rem' }}>
          <Clock size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
          <h2 className="h3-title" style={{ marginBottom: '0.5rem' }}>You Are Not Currently in Queue</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
            Check in for your scheduled appointment today to receive a live queue number and waiting time estimate.
          </p>
        </div>
      )}

      {/* Eligible appointments to check in */}
      {todayAppointments.length > 0 && (!queueEntry || ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(queueEntry.status)) && (
        <div className="card-elevated" style={{ marginBottom: '2rem' }}>
          <h3 className="h3-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={18} style={{ color: 'var(--accent-primary)' }} />
            Eligible for Check-In Today
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {todayAppointments.map((appt) => {
              const doctorName = typeof appt.doctorId === 'object' && appt.doctorId ? (appt.doctorId as any).fullName : 'Doctor';
              return (
                <div
                  key={appt._id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    backgroundColor: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{doctorName}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Scheduled Time: {appt.appointmentTime} &bull; {appt.reason}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCheckIn(appt._id)}
                    disabled={checkingIn === appt._id}
                    className="btn btn-primary btn-sm"
                  >
                    <Clock size={14} />
                    {checkingIn === appt._id ? 'Checking In...' : 'Check In Now'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div style={{
        padding: '1.25rem',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--bg-subtle)',
        border: '1px solid var(--border-subtle)',
        fontSize: '0.825rem',
        color: 'var(--text-muted)',
        lineHeight: 1.5,
      }}>
        <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
          Queue & Estimation Policy
        </div>
        Estimated waiting times are calculated dynamically based on ongoing consultation duration and doctor pacing. Actual consultation times vary depending on clinical needs. Waiting time is only an estimate and does not guarantee an exact entry minute. Please remain within the clinic premises.
      </div>
    </div>
  );
}
