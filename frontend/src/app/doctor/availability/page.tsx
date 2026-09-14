'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { apiRequest } from '@/lib/api';
import { DoctorProfile, WorkingDay } from '@/types';
import { ArrowLeft, Clock, Save, CheckCircle, AlertCircle } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function DoctorAvailabilityPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [workingHours, setWorkingHours] = useState<WorkingDay[]>([]);
  const [slotDuration, setSlotDuration] = useState(30);
  const [roomNumber, setRoomNumber] = useState('');
  const [fee, setFee] = useState(100);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user && user.role !== 'doctor') {
      router.push('/');
      return;
    }

    async function fetchProfile() {
      try {
        const data = await apiRequest<{ doctor: DoctorProfile }>('/api/doctors/me/profile');
        if (data.doctor) {
          setProfile(data.doctor);
          setSlotDuration(data.doctor.slotDurationMinutes || 30);
          setRoomNumber(data.doctor.roomNumber || '');
          setFee(data.doctor.consultationFee || 100);

          if (data.doctor.workingHours && data.doctor.workingHours.length > 0) {
            setWorkingHours(data.doctor.workingHours);
          } else {
            // Default Monday - Friday
            const defaultHours: WorkingDay[] = DAYS.map((_, idx) => ({
              dayOfWeek: idx,
              startTime: '09:00',
              endTime: '17:00',
              isAvailable: idx >= 1 && idx <= 5,
            }));
            setWorkingHours(defaultHours);
          }
        }
      } catch {
        setMessage({ text: 'Could not fetch existing doctor profile.', type: 'error' });
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchProfile();
    }
  }, [user, authLoading, router]);

  const handleToggleDay = (index: number) => {
    setWorkingHours((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], isAvailable: !next[index].isAvailable };
      return next;
    });
  };

  const handleTimeChange = (index: number, field: 'startTime' | 'endTime', value: string) => {
    setWorkingHours((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await apiRequest('/api/doctors/me/profile', {
        method: 'PUT',
        body: JSON.stringify({
          workingHours,
          slotDurationMinutes: slotDuration,
          roomNumber,
          consultationFee: fee,
        }),
      });
      setMessage({ text: 'Schedule & consultation settings updated successfully.', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to update schedule.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="app-container" style={{ padding: '3rem 0', maxWidth: '760px' }}>
        <div className="skeleton" style={{ height: '3rem', width: '50%', marginBottom: '2rem' }} />
        <div className="skeleton" style={{ height: '20rem', width: '100%' }} />
      </div>
    );
  }

  return (
    <div className="app-container" style={{ maxWidth: '780px', padding: '2rem 1.5rem' }}>
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

      <h1 className="h1-title" style={{ marginBottom: '0.35rem' }}>Working Hours & Availability</h1>
      <p className="subtitle" style={{ marginBottom: '2rem' }}>
        Define your weekly schedule, consultation duration, and room assignment to generate booking slots.
      </p>

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
        }}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* General Settings */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 className="h3-title" style={{ marginBottom: '1.25rem' }}>Practice Details</h3>
          <div className="grid-cols-3">
            <div className="form-group">
              <label className="form-label" htmlFor="roomNumber">Consultation Room</label>
              <input
                id="roomNumber"
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="e.g. 204B"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="slotDuration">Slot Duration (Minutes)</label>
              <select
                id="slotDuration"
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value))}
                className="form-select"
              >
                <option value={15}>15 minutes</option>
                <option value={20}>20 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="fee">Consultation Fee ($)</label>
              <input
                id="fee"
                type="number"
                min={0}
                value={fee}
                onChange={(e) => setFee(Number(e.target.value))}
                className="form-input"
                required
              />
            </div>
          </div>
        </div>

        {/* Weekly Hours Table */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 className="h3-title" style={{ marginBottom: '1.25rem' }}>Weekly Schedule</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {workingHours.map((wh, idx) => (
              <div
                key={wh.dayOfWeek}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1rem',
                  backgroundColor: wh.isAvailable ? 'var(--bg-surface-elevated)' : 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '140px' }}>
                  <input
                    type="checkbox"
                    id={`day-${idx}`}
                    checked={wh.isAvailable}
                    onChange={() => handleToggleDay(idx)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
                  />
                  <label htmlFor={`day-${idx}`} style={{ fontWeight: 600, cursor: 'pointer' }}>
                    {DAYS[wh.dayOfWeek]}
                  </label>
                </div>

                {wh.isAvailable ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type="time"
                      value={wh.startTime}
                      onChange={(e) => handleTimeChange(idx, 'startTime', e.target.value)}
                      className="form-input"
                      style={{ width: '130px', padding: '0.45rem 0.65rem' }}
                    />
                    <span style={{ color: 'var(--text-secondary)' }}>to</span>
                    <input
                      type="time"
                      value={wh.endTime}
                      onChange={(e) => handleTimeChange(idx, 'endTime', e.target.value)}
                      className="form-input"
                      style={{ width: '130px', padding: '0.45rem 0.65rem' }}
                    />
                  </div>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Day Off (Clinic Closed)</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary btn-lg"
          style={{ width: '100%' }}
        >
          <Save size={18} />
          {saving ? 'Saving Availability...' : 'Save Schedule Settings'}
        </button>
      </form>
    </div>
  );
}
