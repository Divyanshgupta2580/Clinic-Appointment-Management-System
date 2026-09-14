import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DoctorProfile } from '@/types';
import { 
  User, 
  Stethoscope, 
  Clock, 
  Calendar, 
  MapPin, 
  DollarSign, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight 
} from 'lucide-react';

async function getDoctor(id: string): Promise<DoctorProfile | null> {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const res = await fetch(`${API_URL}/api/doctors/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.doctor || null;
  } catch {
    return null;
  }
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default async function DoctorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doctor = await getDoctor(id);

  if (!doctor) {
    return (
      <div className="app-container" style={{ textAlign: 'center', padding: '5rem 0' }}>
        <h2 className="h2-title" style={{ marginBottom: '1rem' }}>Doctor Profile Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          The requested specialist could not be located or may no longer be active.
        </p>
        <Link href="/doctors" className="btn btn-secondary">
          <ArrowLeft size={16} /> Back to Doctor Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Link href="/doctors" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.875rem',
        color: 'var(--text-secondary)',
        marginBottom: '2rem',
      }}>
        <ArrowLeft size={16} /> Back to Directory
      </Link>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1.2fr)',
        gap: '2.5rem',
      }}>
        {/* Left column: Overview, Bio, Qualifications */}
        <div>
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{
                width: '4.5rem',
                height: '4.5rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--accent-subtle)',
                border: '1px solid var(--accent-border)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <User size={36} />
              </div>
              <div>
                <h1 className="h2-title" style={{ marginBottom: '0.35rem' }}>{doctor.fullName}</h1>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.95rem',
                  color: 'var(--accent-primary)',
                  fontWeight: 600,
                  marginBottom: '0.75rem',
                }}>
                  <Stethoscope size={16} />
                  {doctor.specialization}
                </div>
                <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <MapPin size={15} /> Room {doctor.roomNumber}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock size={15} /> {doctor.experienceYears} Years Experience
                  </div>
                </div>
              </div>
            </div>

            {doctor.bio && (
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>About the Doctor</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6 }}>
                  {doctor.bio}
                </p>
              </div>
            )}
          </div>

          {/* Qualifications & Accreditations */}
          <div className="card">
            <h3 className="h3-title" style={{ marginBottom: '1rem' }}>Degrees & Accreditations</h3>
            {doctor.qualifications && doctor.qualifications.length > 0 ? (
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {doctor.qualifications.map((q, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <CheckCircle2 size={16} style={{ color: 'var(--status-in-progress)' }} />
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Certified General Practitioner</p>
            )}
          </div>
        </div>

        {/* Right column: Working Schedule & Booking action */}
        <div>
          <div className="card-elevated" style={{ position: 'sticky', top: '5.5rem' }}>
            <h3 className="h3-title" style={{ marginBottom: '1rem' }}>Consultation Details</h3>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem 0',
              borderBottom: '1px solid var(--border-subtle)',
              marginBottom: '1.25rem',
            }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Consultation Fee</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                ${doctor.consultationFee}
              </span>
            </div>

            <div style={{ marginBottom: '1.75rem' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Weekly Office Hours
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                {doctor.workingHours && doctor.workingHours.length > 0 ? (
                  doctor.workingHours.map((wh, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.35rem 0',
                      borderBottom: '1px solid rgba(255,255,255,0.03)'
                    }}>
                      <span style={{ color: wh.isAvailable ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {DAYS[wh.dayOfWeek]}
                      </span>
                      <span style={{ color: wh.isAvailable ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                        {wh.isAvailable ? `${wh.startTime} – ${wh.endTime}` : 'Closed'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'var(--text-muted)' }}>Monday to Friday: 09:00 – 17:00</div>
                )}
              </div>
            </div>

            <Link 
              href={`/patient/book?doctorId=${doctor._id}`} 
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem' }}
            >
              Book an Appointment <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
