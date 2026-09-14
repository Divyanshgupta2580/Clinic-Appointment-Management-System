'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { apiRequest } from '@/lib/api';
import { DoctorProfile } from '@/types';
import { 
  Calendar, 
  Clock, 
  User, 
  CheckCircle, 
  AlertCircle, 
  Stethoscope, 
  MapPin, 
  ArrowLeft 
} from 'lucide-react';
import Link from 'next/link';

function BookAppointmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDoctorId = searchParams.get('doctorId') || '';

  const { user, loading: authLoading } = useAuth();

  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(initialDoctorId);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [reason, setReason] = useState('');

  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading]);

  // Fetch doctors
  useEffect(() => {
    async function fetchDoctors() {
      try {
        const data = await apiRequest<{ doctors: DoctorProfile[] }>('/api/doctors');
        setDoctors(data.doctors || []);
        if (!selectedDoctorId && data.doctors && data.doctors.length > 0) {
          setSelectedDoctorId(data.doctors[0]._id);
        }
      } catch {
        setError('Unable to load doctor profiles. Please try again.');
      } finally {
        setLoadingDoctors(false);
      }
    }
    fetchDoctors();
  }, []);

  // Fetch available slots whenever doctor or date changes
  useEffect(() => {
    if (!selectedDoctorId || !selectedDate) return;

    async function fetchSlots() {
      setLoadingSlots(true);
      setError(null);
      setSelectedSlot('');
      try {
        const data = await apiRequest<{ availableSlots: string[] }>(
          `/api/doctors/${selectedDoctorId}/available-slots?date=${selectedDate}`
        );
        setAvailableSlots(data.availableSlots || []);
      } catch {
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    }

    fetchSlots();
  }, [selectedDoctorId, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      setError('Please select an appointment time slot.');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a brief reason for your consultation.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiRequest('/api/appointments', {
        method: 'POST',
        body: JSON.stringify({
          doctorId: selectedDoctorId,
          appointmentDate: selectedDate,
          appointmentTime: selectedSlot,
          reason,
        }),
      });

      setSuccess(true);
      setTimeout(() => {
        router.push('/patient/dashboard');
      }, 1500);
    } catch (err: any) {
      if (err.status === 409) {
        setError('This appointment slot is already reserved. Please select another slot.');
        // Refresh slots
        const data = await apiRequest<{ availableSlots: string[] }>(
          `/api/doctors/${selectedDoctorId}/available-slots?date=${selectedDate}`
        );
        setAvailableSlots(data.availableSlots || []);
      } else {
        setError(err.message || 'Failed to reserve appointment. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDoctor = doctors.find((d) => d._id === selectedDoctorId);

  return (
    <div className="app-container" style={{ maxWidth: '800px', padding: '2rem 1.5rem' }}>
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

      <h1 className="h1-title" style={{ marginBottom: '0.5rem' }}>Book an Appointment</h1>
      <p className="subtitle" style={{ marginBottom: '2.5rem' }}>
        Select a verified practitioner, choose your preferred date and available slot, and confirm your visit.
      </p>

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
          fontSize: '0.9rem',
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: 'var(--status-in-progress-bg)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: 'var(--status-in-progress)',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.95rem',
        }}>
          <CheckCircle size={18} style={{ flexShrink: 0 }} />
          <span>Appointment booked successfully! Redirecting to your dashboard...</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Step 1: Select Doctor */}
        <div className="card" style={{ marginBottom: '1.75rem' }}>
          <h3 className="h3-title" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Stethoscope size={20} style={{ color: 'var(--accent-primary)' }} />
            1. Select Doctor
          </h3>

          {loadingDoctors ? (
            <div className="skeleton" style={{ height: '3rem', width: '100%' }} />
          ) : doctors.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No doctors are currently available for booking.
            </p>
          ) : (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <select
                className="form-select"
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
              >
                {doctors.map((doc) => (
                  <option key={doc._id} value={doc._id}>
                    {doc.fullName} — {doc.specialization} (Fee: ${doc.consultationFee})
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedDoctor && (
            <div style={{
              marginTop: '1rem',
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)'
            }}>
              <span>Room: {selectedDoctor.roomNumber}</span>
              <span>Experience: {selectedDoctor.experienceYears} Years</span>
              <span>Consultation Fee: ${selectedDoctor.consultationFee}</span>
            </div>
          )}
        </div>

        {/* Step 2: Date & Available Slots */}
        <div className="card" style={{ marginBottom: '1.75rem' }}>
          <h3 className="h3-title" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={20} style={{ color: 'var(--accent-primary)' }} />
            2. Choose Date & Available Slot
          </h3>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" htmlFor="appointmentDate">Appointment Date</label>
            <input
              id="appointmentDate"
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div>
            <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>
              Available Time Slots ({selectedDate})
            </label>

            {loadingSlots ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.75rem' }}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="skeleton" style={{ height: '2.5rem' }} />
                ))}
              </div>
            ) : availableSlots.length === 0 ? (
              <div style={{
                padding: '1.5rem',
                backgroundColor: 'var(--bg-surface-elevated)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
              }}>
                No available appointment slots on this date. Please select another date.
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                gap: '0.75rem',
              }}>
                {availableSlots.map((slot) => {
                  const isSelected = selectedSlot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      style={{
                        padding: '0.65rem 0.5rem',
                        borderRadius: 'var(--radius-md)',
                        border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-medium)',
                        backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--bg-surface-elevated)',
                        color: isSelected ? '#ffffff' : 'var(--text-primary)',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Reason for Consultation */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 className="h3-title" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={20} style={{ color: 'var(--accent-primary)' }} />
            3. Reason for Visit
          </h3>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="reason">Consultation Reason or Symptoms</label>
            <textarea
              id="reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Routine blood pressure checkup, recurring migraine, or prescription renewal..."
              className="form-textarea"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || !selectedSlot || loadingSlots}
          className="btn btn-primary btn-lg"
          style={{ width: '100%' }}
        >
          {submitting ? 'Confirming Appointment...' : 'Confirm and Reserve Appointment'}
        </button>
      </form>
    </div>
  );
}

export default function BookAppointmentPage() {
  return (
    <Suspense fallback={<div className="app-container" style={{ padding: '3rem 0' }}>Loading appointment scheduler...</div>}>
      <BookAppointmentContent />
    </Suspense>
  );
}
