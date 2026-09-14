'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { apiRequest } from '@/lib/api';
import { Appointment, QueueSummary } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import { 
  Users, 
  Clock, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  Stethoscope, 
  Activity 
} from 'lucide-react';

export default function DoctorDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [queueSummary, setQueueSummary] = useState<QueueSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDoctorData = async () => {
    try {
      setLoading(true);
      const [apptRes, queueRes] = await Promise.allSettled([
        apiRequest<{ appointments: Appointment[] }>('/api/appointments'),
        apiRequest<{ summary: QueueSummary }>('/api/queue/today'),
      ]);

      if (apptRes.status === 'fulfilled' && apptRes.value.appointments) {
        setAppointments(apptRes.value.appointments);
      }
      if (queueRes.status === 'fulfilled' && queueRes.value.summary) {
        setQueueSummary(queueRes.value.summary);
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
    if (user && user.role !== 'doctor') {
      router.push('/');
      return;
    }
    if (user) {
      fetchDoctorData();
    }
  }, [user, authLoading]);

  const pendingRequests = appointments.filter((a) => a.status === 'PENDING');
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter((a) => a.appointmentDate === todayStr);

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

  return (
    <div className="app-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="h1-title" style={{ marginBottom: '0.35rem' }}>Doctor Console</h1>
          <p className="subtitle">Welcome Dr. {user?.name}. Monitor today's queue, requests, and consultation pacing.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/doctor/queue" className="btn btn-primary">
            <Clock size={16} /> Open Live Queue
          </Link>
          <Link href="/doctor/availability" className="btn btn-secondary">
            Schedule Settings
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid-cols-3" style={{ marginBottom: '2.5rem' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Waiting in Queue</span>
            <Users size={18} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>
            {queueSummary?.totalWaiting ?? 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {queueSummary?.currentServing ? '1 patient currently in consultation' : 'No active consultation'}
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Pending Requests</span>
            <Calendar size={18} style={{ color: 'var(--status-pending)' }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: pendingRequests.length > 0 ? 'var(--status-pending)' : 'inherit' }}>
            {pendingRequests.length}
          </div>
          <Link href="/doctor/appointments" style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
            Review Requests <ArrowRight size={13} />
          </Link>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Today's Scheduled</span>
            <Activity size={18} style={{ color: 'var(--status-in-progress)' }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>
            {todayAppointments.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            For {todayStr}
          </div>
        </div>
      </div>

      {/* Currently Serving or Queue Banner */}
      <div className="card-elevated" style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 className="h3-title">Current Consultation Status</h2>
          <Link href="/doctor/queue" className="btn btn-secondary btn-sm">
            Manage Full Queue
          </Link>
        </div>

        {queueSummary?.currentServing ? (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.25rem',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--accent-border)',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '3.25rem',
                height: '3.25rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--accent-primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.25rem',
              }}>
                #{queueSummary.currentServing.queueNumber}
              </div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                  {queueSummary.currentServing.patientName || 'Checked-In Patient'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Status: <strong>{queueSummary.currentServing.status}</strong> &bull; Scheduled: {queueSummary.currentServing.scheduledTime}
                </div>
              </div>
            </div>
            <Link href="/doctor/queue" className="btn btn-primary btn-sm">
              Complete or Call Next
            </Link>
          </div>
        ) : (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-secondary)',
            fontSize: '0.9rem'
          }}>
            No patient is currently in your consultation room.{' '}
            {queueSummary?.totalWaiting && queueSummary.totalWaiting > 0 ? (
              <Link href="/doctor/queue" style={{ color: 'var(--accent-primary)', fontWeight: 600, marginLeft: '0.35rem' }}>
                Call next waiting patient (#{queueSummary.entries[0]?.queueNumber})
              </Link>
            ) : (
              <span>All checked-in patients have been seen.</span>
            )}
          </div>
        )}
      </div>

      {/* Pending Appointments Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 className="h3-title">Pending Appointment Requests</h2>
          <Link href="/doctor/appointments" style={{ fontSize: '0.875rem', color: 'var(--accent-primary)' }}>
            View All ({pendingRequests.length})
          </Link>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            No pending appointment requests awaiting review.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Date & Time</th>
                  <th>Reason</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.slice(0, 5).map((appt) => {
                  const patientName = typeof appt.patientId === 'object' && appt.patientId ? (appt.patientId as any).name : 'Patient';
                  return (
                    <tr key={appt._id}>
                      <td style={{ fontWeight: 600 }}>{patientName}</td>
                      <td>{appt.appointmentDate} at {appt.appointmentTime}</td>
                      <td>{appt.reason}</td>
                      <td>
                        <Link href="/doctor/appointments" className="btn btn-secondary btn-sm">
                          Review Request
                        </Link>
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
