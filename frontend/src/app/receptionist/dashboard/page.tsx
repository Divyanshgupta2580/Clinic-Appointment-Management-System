'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { apiRequest } from '@/lib/api';
import { Appointment } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import { 
  ClipboardList, 
  UserCheck, 
  UserPlus, 
  Clock, 
  ArrowRight, 
  Calendar, 
  Search,
  CheckCircle2
} from 'lucide-react';

export default function ReceptionistDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [schedule, setSchedule] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<{ appointments: Appointment[] }>('/api/reception/daily-schedule');
      setSchedule(data.appointments || []);
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
    if (user && user.role !== 'receptionist' && user.role !== 'admin') {
      router.push('/');
      return;
    }
    if (user) {
      fetchSchedule();
    }
  }, [user, authLoading]);

  const checkedInCount = schedule.filter((a) => ['CHECKED_IN', 'IN_PROGRESS'].includes(a.status)).length;
  const completedCount = schedule.filter((a) => a.status === 'COMPLETED').length;
  const pendingCheckIn = schedule.filter((a) => a.status === 'CONFIRMED').length;

  const filtered = schedule.filter((a) => {
    const patientName = typeof a.patientId === 'object' && a.patientId ? (a.patientId as any).name : '';
    const doctorName = typeof a.doctorId === 'object' && a.doctorId ? (a.doctorId as any).fullName : '';
    const query = searchQuery.toLowerCase();
    return patientName.toLowerCase().includes(query) || doctorName.toLowerCase().includes(query);
  });

  if (authLoading || loading) {
    return (
      <div className="app-container" style={{ padding: '3rem 0' }}>
        <div className="skeleton" style={{ height: '3rem', width: '40%', marginBottom: '2rem' }} />
        <div className="grid-cols-4" style={{ marginBottom: '2rem' }}>
          <div className="skeleton" style={{ height: '8rem' }} />
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
          <h1 className="h1-title" style={{ marginBottom: '0.35rem' }}>Reception Desk</h1>
          <p className="subtitle">Today's clinic intake schedule, front-desk check-in, and patient queue flow.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/receptionist/check-in" className="btn btn-primary">
            <UserCheck size={16} /> Check In Patient
          </Link>
          <Link href="/receptionist/walk-in" className="btn btn-secondary">
            <UserPlus size={16} /> Register Walk-In
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid-cols-4" style={{ marginBottom: '2.5rem' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total Today</span>
            <Calendar size={18} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{schedule.length}</div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Awaiting Check-In</span>
            <Clock size={18} style={{ color: 'var(--status-pending)' }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: pendingCheckIn > 0 ? 'var(--status-pending)' : 'inherit' }}>
            {pendingCheckIn}
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>In Queue / In Room</span>
            <UserCheck size={18} style={{ color: 'var(--status-checked-in)' }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--status-checked-in)' }}>
            {checkedInCount}
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Completed Visits</span>
            <CheckCircle2 size={18} style={{ color: 'var(--status-completed)' }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--status-completed)' }}>
            {completedCount}
          </div>
        </div>
      </div>

      {/* Today's Schedule Table */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 className="h3-title">Today's Clinic Schedule</h2>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search patient or doctor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            No appointments scheduled for today matching your search query.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time Slot</th>
                  <th>Patient Name</th>
                  <th>Assigned Doctor</th>
                  <th>Room</th>
                  <th>Status</th>
                  <th>Token</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((appt) => {
                  const patientName = typeof appt.patientId === 'object' && appt.patientId ? (appt.patientId as any).name : 'Patient';
                  const doctorName = typeof appt.doctorId === 'object' && appt.doctorId ? (appt.doctorId as any).fullName : 'Doctor';
                  const room = typeof appt.doctorId === 'object' && appt.doctorId ? (appt.doctorId as any).roomNumber : '-';

                  return (
                    <tr key={appt._id}>
                      <td style={{ fontWeight: 600 }}>{appt.appointmentTime}</td>
                      <td>{patientName}</td>
                      <td>{doctorName}</td>
                      <td>{room}</td>
                      <td><StatusBadge status={appt.status} /></td>
                      <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                        {appt.queueNumber ? `#${appt.queueNumber}` : '-'}
                      </td>
                      <td>
                        {appt.status === 'CONFIRMED' ? (
                          <Link
                            href={`/receptionist/check-in?appointmentId=${appt._id}`}
                            className="btn btn-primary btn-sm"
                          >
                            <UserCheck size={13} /> Check In
                          </Link>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {appt.status}
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
