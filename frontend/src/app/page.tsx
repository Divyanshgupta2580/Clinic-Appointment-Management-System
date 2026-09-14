import React from 'react';
import Link from 'next/link';
import { 
  Activity, 
  Clock, 
  Calendar, 
  Users, 
  CheckCircle, 
  ArrowRight, 
  ShieldCheck, 
  Bell, 
  UserCheck, 
  FileText 
} from 'lucide-react';

export default async function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section style={{ padding: '3rem 0 4.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="app-container">
          <div style={{ maxWidth: '820px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--accent-subtle)',
              border: '1px solid var(--accent-border)',
              color: 'var(--accent-primary)',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '1.5rem',
            }}>
              <Activity size={15} />
              <span>Smart Outpatient Workflow & Queue Management</span>
            </div>

            <h1 className="h1-title" style={{ marginBottom: '1.25rem' }}>
              Streamlined Clinic Visits with Live Waiting-Time Transparency
            </h1>

            <p className="subtitle" style={{ fontSize: '1.15rem', marginBottom: '2.25rem' }}>
              MediPulse Clinic is a lightweight clinic workflow and queue-management platform for small clinics that helps patients book appointments, check in, and receive live queue updates while helping clinic staff manage patient flow.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <Link href="/patient/book" className="btn btn-primary btn-lg">
                Book an Appointment <ArrowRight size={18} />
              </Link>
              <Link href="/doctors" className="btn btn-secondary btn-lg">
                Find a Doctor
              </Link>
              <Link href="/patient/queue" className="btn btn-secondary btn-lg" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={18} /> Track Live Queue
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Core Workflow Pillars */}
      <section style={{ padding: '4.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="app-container">
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 className="h2-title" style={{ marginBottom: '0.75rem' }}>
              Designed for Clinic Efficiency and Patient Peace of Mind
            </h2>
            <p className="subtitle" style={{ maxWidth: '640px', margin: '0 auto' }}>
              Replacing crowded waiting rooms and scheduling uncertainty with clear, live digital communication.
            </p>
          </div>

          <div className="grid-cols-3">
            {/* Feature 1 */}
            <div className="card card-hover">
              <div style={{
                width: '3rem',
                height: '3rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--accent-subtle)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
              }}>
                <Clock size={24} />
              </div>
              <h3 className="h3-title" style={{ marginBottom: '0.65rem' }}>
                Smart Clinic Queue
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6 }}>
                Patients check in digitally, receive a sequential queue number, see how many patients are ahead, and track estimated waiting times in real time.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card card-hover">
              <div style={{
                width: '3rem',
                height: '3rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: 'var(--status-in-progress)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
              }}>
                <UserCheck size={24} />
              </div>
              <h3 className="h3-title" style={{ marginBottom: '0.65rem' }}>
                Doctor & Staff Console
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6 }}>
                Physicians view today's patient list, call the next patient to consultation, mark no-shows, and broadcast delay notices directly to waiting patients.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card card-hover">
              <div style={{
                width: '3rem',
                height: '3rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                color: 'var(--status-checked-in)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
              }}>
                <Calendar size={24} />
              </div>
              <h3 className="h3-title" style={{ marginBottom: '0.65rem' }}>
                Conflict-Free Scheduling
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6 }}>
                Book visits with verified doctors according to live working schedules. Automated slot verification ensures smooth, unconflicted appointments.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Role Operations Overview */}
      <section style={{ padding: '4.5rem 0' }}>
        <div className="app-container">
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 className="h2-title" style={{ marginBottom: '0.75rem' }}>
              Coordinated Experience Across Every Role
            </h2>
            <p className="subtitle" style={{ maxWidth: '640px', margin: '0 auto' }}>
              Four dedicated portals designed around each role's daily responsibilities.
            </p>
          </div>

          <div className="grid-cols-2">
            <div className="card-elevated">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Users size={20} style={{ color: 'var(--accent-primary)' }} />
                <h3 className="h3-title">For Patients</h3>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={16} style={{ color: 'var(--status-in-progress)' }} />
                  Browse doctor specialties, qualifications, and consultation hours
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={16} style={{ color: 'var(--status-in-progress)' }} />
                  Reserve an appointment slot online with instant confirmation
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={16} style={{ color: 'var(--status-in-progress)' }} />
                  Check in upon arrival and monitor live queue progress on mobile
                </li>
              </ul>
            </div>

            <div className="card-elevated">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Activity size={20} style={{ color: 'var(--status-in-progress)' }} />
                <h3 className="h3-title">For Doctors</h3>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={16} style={{ color: 'var(--status-in-progress)' }} />
                  Manage today's consultation schedule and patient requests
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={16} style={{ color: 'var(--status-in-progress)' }} />
                  One-click calling of the next patient into the consultation room
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={16} style={{ color: 'var(--status-in-progress)' }} />
                  Record consultation start, completion, and no-show entries
                </li>
              </ul>
            </div>

            <div className="card-elevated">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <UserCheck size={20} style={{ color: 'var(--status-checked-in)' }} />
                <h3 className="h3-title">For Reception Staff</h3>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={16} style={{ color: 'var(--status-in-progress)' }} />
                  Arrive and check in scheduled patients as they enter the clinic
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={16} style={{ color: 'var(--status-in-progress)' }} />
                  Intake walk-in patients and assign queue numbers instantly
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={16} style={{ color: 'var(--status-in-progress)' }} />
                  Coordinate patient flow across multiple doctor consultation rooms
                </li>
              </ul>
            </div>

            <div className="card-elevated">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <ShieldCheck size={20} style={{ color: 'var(--status-pending)' }} />
                <h3 className="h3-title">For Administrators</h3>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={16} style={{ color: 'var(--status-in-progress)' }} />
                  Configure clinic operating hours, consultation rooms, and staff accounts
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={16} style={{ color: 'var(--status-in-progress)' }} />
                  Create and manage doctor specialty profiles and working schedules
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={16} style={{ color: 'var(--status-in-progress)' }} />
                  Inspect audit logs for all security and appointment operations
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
