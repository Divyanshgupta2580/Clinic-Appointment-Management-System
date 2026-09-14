import React from 'react';
import Link from 'next/link';
import { DoctorProfile } from '@/types';
import { User, Stethoscope, Clock, Calendar, MapPin, ArrowRight } from 'lucide-react';

async function getDoctors(): Promise<DoctorProfile[]> {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const res = await fetch(`${API_URL}/api/doctors`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.doctors || [];
  } catch {
    return [];
  }
}

export default async function DoctorsPage() {
  const doctors = await getDoctors();

  return (
    <div className="app-container">
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 className="h1-title" style={{ marginBottom: '0.5rem' }}>Find a Doctor</h1>
        <p className="subtitle">
          Consult with verified specialists across clinical departments. Book your appointment slot directly.
        </p>
      </div>

      {doctors.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{
            width: '3.5rem',
            height: '3.5rem',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-surface-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            color: 'var(--text-secondary)'
          }}>
            <Stethoscope size={28} />
          </div>
          <h3 className="h3-title" style={{ marginBottom: '0.5rem' }}>No Doctors Listed Currently</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto 1.5rem', fontSize: '0.925rem' }}>
            Our medical staff profiles are currently being updated. Please visit our reception desk or check back shortly.
          </p>
          <Link href="/patient/book" className="btn btn-primary">
            Check Booking Calendar
          </Link>
        </div>
      ) : (
        <div className="grid-cols-3">
          {doctors.map((doc) => (
            <div key={doc._id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{
                  width: '3.25rem',
                  height: '3.25rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--accent-subtle)',
                  border: '1px solid var(--accent-border)',
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <User size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    {doc.fullName}
                  </h3>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.8rem',
                    color: 'var(--accent-primary)',
                    fontWeight: 600
                  }}>
                    <Stethoscope size={14} />
                    {doc.specialization}
                  </div>
                </div>
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                marginBottom: '1.5rem',
                flex: 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={15} style={{ color: 'var(--text-muted)' }} />
                  <span>Room: {doc.roomNumber || 'Consultation Room'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={15} style={{ color: 'var(--text-muted)' }} />
                  <span>Experience: {doc.experienceYears} years</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={15} style={{ color: 'var(--text-muted)' }} />
                  <span>Consultation Fee: ${doc.consultationFee}</span>
                </div>
                {doc.qualifications && doc.qualifications.length > 0 && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {doc.qualifications.join(', ')}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
                <Link href={`/doctors/${doc._id}`} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                  View Profile
                </Link>
                <Link href={`/patient/book?doctorId=${doc._id}`} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                  Book Slot <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
