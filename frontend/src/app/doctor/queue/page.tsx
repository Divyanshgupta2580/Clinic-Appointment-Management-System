'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { apiRequest } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { QueueSummary, QueueEntry } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import { 
  Clock, 
  User, 
  PhoneCall, 
  Play, 
  CheckCircle, 
  UserX, 
  Pause, 
  AlertTriangle, 
  ArrowLeft, 
  RefreshCw,
  Send,
  Activity
} from 'lucide-react';

export default function DoctorQueueManagementPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [summary, setSummary] = useState<QueueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  
  // Delay Notice Modal
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [delayMinutes, setDelayMinutes] = useState(15);
  const [delayReason, setDelayReason] = useState('Emergency outpatient case in progress');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchQueue = useCallback(async () => {
    try {
      const data = await apiRequest<{ summary: QueueSummary }>('/api/queue/today');
      setSummary(data.summary || null);
    } catch {
      // Handled gracefully
    }
  }, []);

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
      fetchQueue().finally(() => setLoading(false));

      const socket = getSocket();
      if (socket) {
        setSocketConnected(socket.connected);

        const onUpdate = () => fetchQueue();
        socket.on('queue_updated', onUpdate);
        socket.on('patient_checked_in', onUpdate);
        socket.on('consultation_started', onUpdate);
        socket.on('consultation_completed', onUpdate);

        const interval = setInterval(fetchQueue, 20000);

        return () => {
          socket.off('queue_updated', onUpdate);
          socket.off('patient_checked_in', onUpdate);
          socket.off('consultation_started', onUpdate);
          socket.off('consultation_completed', onUpdate);
          clearInterval(interval);
        };
      }
    }
  }, [user, authLoading, fetchQueue, router]);

  const handleCallNext = async () => {
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const data = await apiRequest<{ success: boolean; entry: QueueEntry; message: string }>('/api/queue/call-next', {
        method: 'POST',
      });
      setStatusMessage({ text: data.message || 'Next patient called.', type: 'success' });
      fetchQueue();
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'No waiting patients in queue.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartConsultation = async (queueId: string) => {
    setActionLoading(true);
    setStatusMessage(null);
    try {
      await apiRequest('/api/queue/start-consultation', {
        method: 'POST',
        body: JSON.stringify({ queueId }),
      });
      setStatusMessage({ text: 'Consultation started.', type: 'success' });
      fetchQueue();
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to start consultation.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteConsultation = async (queueId: string) => {
    setActionLoading(true);
    setStatusMessage(null);
    try {
      await apiRequest('/api/queue/complete-consultation', {
        method: 'POST',
        body: JSON.stringify({ queueId }),
      });
      setStatusMessage({ text: 'Consultation marked completed.', type: 'success' });
      fetchQueue();
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to complete consultation.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleNoShow = async (queueId: string) => {
    if (!confirm('Mark this patient as no-show? They will be removed from the active queue.')) return;
    setActionLoading(true);
    setStatusMessage(null);
    try {
      await apiRequest('/api/queue/no-show', {
        method: 'POST',
        body: JSON.stringify({ queueId }),
      });
      setStatusMessage({ text: 'Patient recorded as no-show.', type: 'success' });
      fetchQueue();
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Action failed.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePause = async () => {
    setActionLoading(true);
    try {
      const nextState = !summary?.isPaused;
      await apiRequest('/api/queue/pause', {
        method: 'POST',
        body: JSON.stringify({ isPaused: nextState }),
      });
      setStatusMessage({ text: nextState ? 'Queue paused.' : 'Queue resumed.', type: 'success' });
      fetchQueue();
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to toggle queue pause state.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBroadcastDelay = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await apiRequest('/api/queue/delay-notice', {
        method: 'POST',
        body: JSON.stringify({ delayMinutes, reason: delayReason }),
      });
      setShowDelayModal(false);
      setStatusMessage({ text: `Broadcasted ${delayMinutes}-minute delay notice to waiting patients.`, type: 'success' });
      fetchQueue();
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to broadcast delay notice.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="app-container" style={{ padding: '3rem 0' }}>
        <div className="skeleton" style={{ height: '3rem', width: '50%', marginBottom: '2rem' }} />
        <div className="skeleton" style={{ height: '14rem', width: '100%' }} />
      </div>
    );
  }

  const currentPatient = summary?.currentServing;
  const waitingPatients = (summary?.entries || []).filter((e) => ['WAITING', 'CALLED'].includes(e.status));

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

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="h1-title" style={{ marginBottom: '0.25rem' }}>Queue Management</h1>
          <p className="subtitle">
            Room: {summary?.roomNumber || 'Consultation Room'} &bull; {summary?.totalWaiting ?? 0} Patients Waiting
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleTogglePause}
            disabled={actionLoading}
            className={`btn btn-sm ${summary?.isPaused ? 'btn-danger' : 'btn-secondary'}`}
          >
            {summary?.isPaused ? <Play size={14} /> : <Pause size={14} />}
            {summary?.isPaused ? 'Resume Queue' : 'Pause Queue'}
          </button>
          <button
            onClick={() => setShowDelayModal(true)}
            className="btn btn-secondary btn-sm"
          >
            <AlertTriangle size={14} /> Broadcast Delay
          </button>
          <button
            onClick={fetchQueue}
            className="btn btn-secondary btn-sm"
            title="Refresh queue"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {statusMessage && (
        <div style={{
          backgroundColor: statusMessage.type === 'success' ? 'var(--status-in-progress-bg)' : 'var(--status-cancelled-bg)',
          border: `1px solid ${statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
          color: statusMessage.type === 'success' ? 'var(--status-in-progress)' : 'var(--status-cancelled)',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '2rem',
          fontSize: '0.9rem',
        }}>
          {statusMessage.text}
        </div>
      )}

      {/* Current Active Consultation Card */}
      <div className="card-elevated" style={{
        marginBottom: '2.5rem',
        border: '1px solid var(--accent-border)',
        backgroundColor: 'var(--bg-surface-elevated)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="h3-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={20} style={{ color: 'var(--accent-primary)' }} />
            Active In-Room Consultation
          </h2>
          {currentPatient && <StatusBadge status={currentPatient.status} />}
        </div>

        {currentPatient ? (
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)',
              gap: '1.5rem',
              alignItems: 'center',
              marginBottom: '1.5rem',
            }}>
              <div style={{
                padding: '1.5rem',
                backgroundColor: 'var(--bg-base)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
                border: '1px solid var(--border-medium)',
              }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Token Number</div>
                <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--accent-primary)', lineHeight: 1.1 }}>
                  #{currentPatient.queueNumber}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  {currentPatient.patientName || 'Patient'}
                </h3>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <div>Scheduled Time: {currentPatient.scheduledTime}</div>
                  <div>Checked In: {currentPatient.checkInTime}</div>
                  {currentPatient.startedTime && (
                    <div>Consultation Began: {currentPatient.startedTime}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons for current patient */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
              {currentPatient.status === 'CALLED' ? (
                <button
                  onClick={() => handleStartConsultation(currentPatient._id)}
                  disabled={actionLoading}
                  className="btn btn-primary"
                >
                  <Play size={16} /> Patient Entered: Start Consultation
                </button>
              ) : (
                <button
                  onClick={() => handleCompleteConsultation(currentPatient._id)}
                  disabled={actionLoading}
                  className="btn btn-primary"
                >
                  <CheckCircle size={16} /> Mark Consultation Completed
                </button>
              )}

              <button
                onClick={() => handleNoShow(currentPatient._id)}
                disabled={actionLoading}
                className="btn btn-secondary"
                style={{ color: 'var(--status-no-show)' }}
              >
                <UserX size={16} /> Mark No-Show
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            padding: '2.5rem',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
          }}>
            <User size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              No Patient Currently in Consultation
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              {waitingPatients.length > 0
                ? `${waitingPatients.length} patient${waitingPatients.length > 1 ? 's' : ''} waiting in the queue.`
                : 'All checked-in patients have been seen.'}
            </p>

            <button
              onClick={handleCallNext}
              disabled={actionLoading || waitingPatients.length === 0}
              className="btn btn-primary btn-lg"
            >
              <PhoneCall size={18} /> Call Next Patient
            </button>
          </div>
        )}
      </div>

      {/* Waiting Patient Queue List */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 className="h3-title">Next Patients in Order ({waitingPatients.length})</h2>
          {waitingPatients.length > 0 && !currentPatient && (
            <button
              onClick={handleCallNext}
              disabled={actionLoading}
              className="btn btn-primary btn-sm"
            >
              <PhoneCall size={14} /> Call Next
            </button>
          )}
        </div>

        {waitingPatients.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            No more patients currently waiting in line.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Token #</th>
                  <th>Patient Name</th>
                  <th>Scheduled Slot</th>
                  <th>Check-In Time</th>
                  <th>Est. Wait</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {waitingPatients.map((entry) => (
                  <tr key={entry._id}>
                    <td style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent-primary)' }}>
                      #{entry.queueNumber}
                    </td>
                    <td style={{ fontWeight: 600 }}>{entry.patientName || 'Checked-In Patient'}</td>
                    <td>{entry.scheduledTime}</td>
                    <td>{entry.checkInTime}</td>
                    <td>{entry.estimatedWaitMinutes ? `~${entry.estimatedWaitMinutes}m` : 'Next'}</td>
                    <td><StatusBadge status={entry.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleStartConsultation(entry._id)}
                          disabled={actionLoading}
                          className="btn btn-secondary btn-sm"
                          title="Call immediately"
                        >
                          <Play size={13} /> Call
                        </button>
                        <button
                          onClick={() => handleNoShow(entry._id)}
                          disabled={actionLoading}
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--status-no-show)' }}
                          title="Mark no-show"
                        >
                          <UserX size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delay Notice Modal */}
      {showDelayModal && (
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
          <div className="card-elevated" style={{ maxWidth: '460px', width: '100%' }}>
            <h3 className="h3-title" style={{ marginBottom: '0.5rem' }}>Broadcast Queue Delay Notice</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Notify all waiting patients of an operational delay to keep expectations accurate.
            </p>
            <form onSubmit={handleBroadcastDelay}>
              <div className="form-group">
                <label className="form-label" htmlFor="delayMinutes">Estimated Additional Delay (Minutes)</label>
                <input
                  id="delayMinutes"
                  type="number"
                  min={5}
                  max={120}
                  value={delayMinutes}
                  onChange={(e) => setDelayMinutes(Number(e.target.value))}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="delayReason">Clinical Reason for Delay</label>
                <input
                  id="delayReason"
                  type="text"
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowDelayModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary btn-sm"
                >
                  <Send size={14} /> Broadcast Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
