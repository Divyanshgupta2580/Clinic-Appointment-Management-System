'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { apiRequest } from '@/lib/api';
import { DoctorProfile, QueueEntry } from '@/types';
import { 
  UserPlus, 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle, 
  Stethoscope, 
  Clock 
} from 'lucide-react';

export default function WalkInRegistrationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [reason, setReason] = useState('');

  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [createdEntry, setCreatedEntry] = useState<QueueEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user && user.role !== 'receptionist' && user.role !== 'admin') {
      router.push('/');
      return;
    }

    async function fetchDoctors() {
      try {
        const data = await apiRequest<{ doctors: DoctorProfile[] }>('/api/doctors');
        setDoctors(data.doctors || []);
        if (data.doctors && data.doctors.length > 0) {
          setSelectedDoctorId(data.doctors[0]._id);
        }
      } catch {
        setError('Failed to load clinic doctors.');
      } finally {
        setLoadingDoctors(false);
      }
    }

    if (user) {
      fetchDoctors();
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !patientName.trim()) {
      setError('Please provide patient name and select an available doctor.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const data = await apiRequest<{ success: boolean; entry: QueueEntry; message: string }>('/api/queue/walk-in', {
        method: 'POST',
        body: JSON.stringify({
          doctorId: selectedDoctorId,
          patientName,
          patientEmail: patientEmail.trim() || undefined,
          patientPhone: patientPhone.trim() || undefined,
          reason: reason.trim() || 'General Walk-In Consultation',
        }),
      });

      setCreatedEntry(data.entry);
      // Clear form
      setPatientName('');
      setPatientEmail('');
      setPatientPhone('');
      setReason('');
    } catch (err: any) {
      setError(err.message || 'Failed to register walk-in patient.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDoctor = doctors.find((d) => d._id === selectedDoctorId);

  return (
    <div className="app-container" style={{ maxWidth: '720px', padding: '2rem 1.5rem' }}>
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

      <h1 className="h1-title" style={{ marginBottom: '0.35rem' }}>Walk-In Patient Intake</h1>
      <p className="subtitle" style={{ marginBottom: '2rem' }}>
        Register an unscheduled outpatient and assign the next sequential queue token immediately.
      </p>

      {/* Token Success Banner */}
      {createdEntry && (
        <div className="card-elevated" style={{
          border: '1px solid var(--accent-border)',
          backgroundColor: 'rgba(2, 132, 199, 0.1)',
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
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.8rem',
          }}>
            #{createdEntry.queueNumber}
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
              Walk-In Token Generated
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              Queue Ticket #{createdEntry.queueNumber} Assigned
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Patient has been added to Dr. {createdEntry.doctorName || selectedDoctor?.fullName}'s queue.
            </div>
          </div>
        </div>
      )}

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
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card">
        {/* Doctor Assignment */}
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label className="form-label" htmlFor="doctorSelect">Assign to Doctor</label>
          {loadingDoctors ? (
            <div className="skeleton" style={{ height: '2.75rem', width: '100%' }} />
          ) : doctors.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No doctors currently available.</p>
          ) : (
            <select
              id="doctorSelect"
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="form-select"
              required
            >
              {doctors.map((doc) => (
                <option key={doc._id} value={doc._id}>
                  {doc.fullName} — {doc.specialization} (Room: {doc.roomNumber})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Patient Name */}
        <div className="form-group">
          <label className="form-label" htmlFor="patientName">Patient Full Name</label>
          <input
            id="patientName"
            type="text"
            required
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder="e.g. Alex Morgan"
            className="form-input"
          />
        </div>

        {/* Contact info grid */}
        <div className="grid-cols-2" style={{ marginBottom: '1.25rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="patientEmail">Email Address (Optional)</label>
            <input
              id="patientEmail"
              type="email"
              value={patientEmail}
              onChange={(e) => setPatientEmail(e.target.value)}
              placeholder="alex@example.com"
              className="form-input"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="patientPhone">Phone Number (Optional)</label>
            <input
              id="patientPhone"
              type="tel"
              value={patientPhone}
              onChange={(e) => setPatientPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="form-input"
            />
          </div>
        </div>

        {/* Reason */}
        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <label className="form-label" htmlFor="reason">Consultation Reason / Symptoms</label>
          <textarea
            id="reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Sudden allergy reaction, acute back pain..."
            className="form-textarea"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || loadingDoctors || doctors.length === 0}
          className="btn btn-primary btn-lg"
          style={{ width: '100%' }}
        >
          <UserPlus size={18} />
          {submitting ? 'Registering & Assigning Token...' : 'Register Walk-In & Issue Token'}
        </button>
      </form>
    </div>
  );
}
