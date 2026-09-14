'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { apiRequest } from '@/lib/api';
import { 
  Users, 
  Stethoscope, 
  Calendar, 
  ShieldAlert, 
  ArrowRight, 
  ClipboardList, 
  Settings 
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<{
    totalUsers: number;
    totalDoctors: number;
    totalAppointments: number;
    totalAuditLogs: number;
  }>({ totalUsers: 0, totalDoctors: 0, totalAppointments: 0, totalAuditLogs: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user && user.role !== 'admin') {
      router.push('/');
      return;
    }

    async function fetchAdminStats() {
      try {
        const [usersRes, docsRes, apptRes, auditRes] = await Promise.allSettled([
          apiRequest<{ users: any[] }>('/api/admin/users'),
          apiRequest<{ doctors: any[] }>('/api/doctors'),
          apiRequest<{ appointments: any[] }>('/api/appointments'),
          apiRequest<{ logs: any[] }>('/api/admin/audit-logs'),
        ]);

        setStats({
          totalUsers: usersRes.status === 'fulfilled' ? (usersRes.value.users || []).length : 0,
          totalDoctors: docsRes.status === 'fulfilled' ? (docsRes.value.doctors || []).length : 0,
          totalAppointments: apptRes.status === 'fulfilled' ? (apptRes.value.appointments || []).length : 0,
          totalAuditLogs: auditRes.status === 'fulfilled' ? (auditRes.value.logs || []).length : 0,
        });
      } catch {
        // Handled gracefully
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchAdminStats();
    }
  }, [user, authLoading, router]);

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
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 className="h1-title" style={{ marginBottom: '0.35rem' }}>System Administration</h1>
        <p className="subtitle">Operational metrics, user roles, practitioner profiles, and security audit logs.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid-cols-4" style={{ marginBottom: '2.5rem' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total Users</span>
            <Users size={18} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.totalUsers}</div>
          <Link href="/admin/users" style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem' }}>
            Manage Users <ArrowRight size={13} />
          </Link>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Active Doctors</span>
            <Stethoscope size={18} style={{ color: 'var(--status-in-progress)' }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.totalDoctors}</div>
          <Link href="/doctors" style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem' }}>
            View Directory <ArrowRight size={13} />
          </Link>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Appointments</span>
            <Calendar size={18} style={{ color: 'var(--status-confirmed)' }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.totalAppointments}</div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>System lifetime</span>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Audit Log Events</span>
            <ClipboardList size={18} style={{ color: 'var(--status-pending)' }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.totalAuditLogs}</div>
          <Link href="/admin/audit-logs" style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem' }}>
            Review Logs <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Admin Quick Action Cards */}
      <div className="grid-cols-2">
        <Link href="/admin/users" className="card card-hover" style={{ display: 'block' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <Users size={22} style={{ color: 'var(--accent-primary)' }} />
            <h3 className="h3-title">User Role Administration</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Inspect all registered accounts across patient, doctor, receptionist, and admin tiers. Modify user roles as required.
          </p>
        </Link>

        <Link href="/admin/audit-logs" className="card card-hover" style={{ display: 'block' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <ClipboardList size={22} style={{ color: 'var(--status-in-progress)' }} />
            <h3 className="h3-title">Security & Clinical Audit Trail</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Review immutable timestamped records of logins, appointment updates, queue actions, and doctor schedule modifications.
          </p>
        </Link>
      </div>
    </div>
  );
}
