'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { apiRequest } from '@/lib/api';
import { Appointment, QueueEntry } from '@/types';
import { 
  UserCheck, 
  ArrowLeft, 
  Search, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw 
} from 'lucide-react';

function CheckInDeskContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetApptId = searchParams.get('appointmentId');

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [recentToken, setRecentToken] = useState<{ number: number; patient: string; doctor: string } | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchReadyAppointments = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<{ appointments: Appointment[] }>('/api/reception/daily-schedule');
      const ready = (data.appointments || []).filter((a) => a.status === 'CONFIRMED');
      setAppointments(ready);
    } catch {
      setMessage({ text: 'Failed to fetch confirmed appointments.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user && user.role !== 'receptionist' && user.role !== 'admin') {
      router.push('/');
      return;
    }
    if (user) {
      fetchReadyAppointments();
    }
  }, [user, authLoading]);

  // Auto-check in if targetApptId query param passed
  useEffect(() => {
    if (targetApptId && appointments.length > 0) {
      const match = appointments.find((a) => a._id === targetApptId);
      if (match) {
        handleCheckIn(match._id);
      }
    }
  }, [targetApptId, appointments.length]);

  const handleCheckIn = async (appointmentId: string) => {
    setCheckingInId(appointmentId);
    setMessage(null);
    try {
      const data = await apiRequest<{ success: boolean; entry: QueueEntry; message: string }>('/api/queue/check-in', {
        method: 'POST',
        body: JSON.stringify({ appointmentId }),
      });

      const appt = appointments.find((a) => a._id === appointmentId);
      const patientName = typeof appt?.patientId === 'object' && appt?.patientId ? (appt.patientId as any).name : 'Patient';
      const doctorName = typeof appt?.doctorId === 'object' && appt?.doctorId ? (appt.doctorId as any).fullName : 'Doctor';

      setRecentToken({
        number: data.entry.queueNumber,
        patient: patientName,
        doctor: doctorName,
      });

      setMessage({ text: `Patient checked in. Assigned Queue Token #${data.entry.queueNumber}`, type: 'success' });
      fetchReadyAppointments();
    } catch (err: any) {
      setMessage({ text: err.message || 'Check-in failed.', type: 'error' });
    } finally {
      setCheckingInId(null);
    }
  };

  const filtered = appointments.filter((a) => {
    const patientName = typeof a.patientId === 'object' && a.patientId ? (a.patientId as any).name : '';
    const doctorName = typeof a.doctorId === 'object' && a.doctorId ? (a.doctorId as any).fullName : '';
    const q = search.toLowerCase();
    return patientName.toLowerCase().includes(q) || doctorName.toLowerCase().includes(q);
  });

  return (
    <div className="app-container" style={{ maxWidth: '880px', padding: '2rem 1.5rem' }}>
      <Link href="/receptionist/dashboard" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontSize: '0.875rem',
        color: 'var(--text-secondary)',
        marginBottom: '1.5rem',
      }}>
        <ArrowLeft size={16} /> Back to Reception Desk
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="h1-title" style={{ marginBottom: '0.35rem' }}>Patient Check-In Desk</h1>
          <p className="subtitle">Check in arriving patients for today and issue their sequential queue number.</p>
        </div>
        <button onClick={fetchReadyAppointments} className="btn btn-secondary btn-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Issued Token Banner */}
      {recentToken && (
        <div className="card-elevated" style={{
          backgroundColor: 'rgba(2, 132, 199, 0.1)',
          border: '1px solid var(--accent-border)',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
        }}>
          <div style={{
            width: '4.5rem',
            height: '4.5rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--accent-primary)',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.75rem',
          }}>
            #{recentToken.number}
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Token Issued Just Now
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {recentToken.patient}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Assigned to Dr. {recentToken.doctor} &bull; Please ask patient to take a seat in the waiting hall.
            </div>
          </div>
        </div>
      )}

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
      <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Filter arriving patients by name or assigned doctor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input"
          style={{ paddingLeft: '2.5rem' }}
        />
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: '14rem', width: '100%' }} />
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-secondary)' }}>
          No confirmed appointments awaiting check-in at this time.
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Scheduled Slot</th>
                <th>Patient Name</th>
                <th>Assigned Doctor</th>
                <th>Consultation Reason</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((appt) => {
                const patientName = typeof appt.patientId === 'object' && appt.patientId ? (appt.patientId as any).name : 'Patient';
                const doctorName = typeof appt.doctorId === 'object' && appt.doctorId ? (appt.doctorId as any).fullName : 'Doctor';

                return (
                  <tr key={appt._id}>
                    <td style={{ fontWeight: 600 }}>{appt.appointmentTime}</td>
                    <td style={{ fontWeight: 600 }}>{patientName}</td>
                    <td>{doctorName}</td>
                    <td style={{ maxWidth: '220px' }}>{appt.reason}</td>
                    <td>
                      <button
                        onClick={() => handleCheckIn(appt._id)}
                        disabled={checkingInId === appt._id}
                        className="btn btn-primary btn-sm"
                      >
                        <UserCheck size={14} />
                        {checkingInId === appt._id ? 'Checking In...' : 'Check In Now'}
                      </button>
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

export default function CheckInDeskPage() {
  return (
    <Suspense fallback={<div className="app-container" style={{ padding: '3rem 0' }}>Loading check-in desk...</div>}>
      <CheckInDeskContent />
    </Suspense>
  );
}
