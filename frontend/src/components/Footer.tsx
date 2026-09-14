import React from 'react';
import Link from 'next/link';
import { Activity, ShieldCheck, Clock, MapPin, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border-subtle)',
      backgroundColor: 'var(--bg-surface)',
      padding: '3rem 0 2rem',
      marginTop: 'auto',
    }}>
      <div className="app-container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '2.5rem',
          marginBottom: '2.5rem',
        }}>
          {/* Brand & Purpose */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <div style={{
                width: '2rem',
                height: '2rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--accent-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)',
              }}>
                <Activity size={18} />
              </div>
              <span style={{ fontSize: '1.15rem', fontWeight: 700 }}>MediPulse Clinic</span>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              A lightweight clinic workflow and queue-management platform designed for small clinics to streamline patient visits, reduce waiting friction, and coordinate staff operations.
            </p>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Patient Services
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.875rem' }}>
              <li><Link href="/doctors" style={{ color: 'var(--text-secondary)' }}>Find Doctors & Specialties</Link></li>
              <li><Link href="/patient/book" style={{ color: 'var(--text-secondary)' }}>Book a Consultation</Link></li>
              <li><Link href="/patient/queue" style={{ color: 'var(--text-secondary)' }}>Live Queue Tracker</Link></li>
              <li><Link href="/login" style={{ color: 'var(--text-secondary)' }}>Patient Portal Login</Link></li>
            </ul>
          </div>

          {/* Clinical Staff */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Clinic Staff
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.875rem' }}>
              <li><Link href="/doctor/dashboard" style={{ color: 'var(--text-secondary)' }}>Doctor Console</Link></li>
              <li><Link href="/receptionist/dashboard" style={{ color: 'var(--text-secondary)' }}>Reception Check-In</Link></li>
              <li><Link href="/receptionist/walk-in" style={{ color: 'var(--text-secondary)' }}>Walk-In Intake</Link></li>
              <li><Link href="/admin/dashboard" style={{ color: 'var(--text-secondary)' }}>Administrator Settings</Link></li>
            </ul>
          </div>

          {/* Operational Contact */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Clinic Hours & Location
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <Clock size={16} style={{ marginTop: '0.2rem', color: 'var(--accent-primary)', flexShrink: 0 }} />
                <span>Monday – Saturday: 08:30 AM – 06:00 PM</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <MapPin size={16} style={{ marginTop: '0.2rem', color: 'var(--accent-primary)', flexShrink: 0 }} />
                <span>Suite 100, Healthcare Plaza, Main Campus</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Phone size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                <span>Desk: +1 (555) 234-5678</span>
              </div>
            </div>
          </div>
        </div>

        {/* Medical & Queue Disclaimer */}
        <div style={{
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '1.5rem',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          lineHeight: 1.5,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}>
          <p>
            <strong>Operational Notice:</strong> MediPulse Clinic is a lightweight clinic workflow and queue-management platform. Waiting-time estimates are approximations calculated from current consultation pace and do not constitute emergency medical triage or diagnostic care. For life-threatening emergencies, please immediately contact your local emergency services.
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            <span>&copy; {new Date().getFullYear()} MediPulse Clinic. All rights reserved.</span>
            <div style={{ display: 'flex', gap: '1.25rem' }}>
              <Link href="/privacy" style={{ color: 'var(--text-muted)' }}>Privacy Policy</Link>
              <Link href="/terms" style={{ color: 'var(--text-muted)' }}>Terms of Service</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
