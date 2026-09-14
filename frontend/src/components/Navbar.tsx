'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { 
  Activity, 
  Calendar, 
  Clock, 
  Users, 
  User, 
  LogOut, 
  LogIn, 
  Menu, 
  X, 
  Shield, 
  ClipboardList 
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'doctor': return '/doctor/dashboard';
      case 'receptionist': return '/receptionist/dashboard';
      case 'admin': return '/admin/dashboard';
      default: return '/patient/dashboard';
    }
  };

  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      backgroundColor: 'rgba(9, 10, 15, 0.85)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      width: '100%',
    }}>
      <div className="app-container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '4.25rem',
      }}>
        {/* Brand Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '2.25rem',
            height: '2.25rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--accent-subtle)',
            border: '1px solid var(--accent-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-primary)',
          }}>
            <Activity size={20} />
          </div>
          <div>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.02em' }}>MediPulse</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '0.35rem' }}>Clinic</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav style={{ display: 'none', alignItems: 'center', gap: '1.75rem' }} className="desktop-nav">
          <Link 
            href="/doctors" 
            style={{ 
              fontSize: '0.9rem', 
              fontWeight: 500, 
              color: pathname === '/doctors' ? 'var(--text-primary)' : 'var(--text-secondary)' 
            }}
          >
            Find a Doctor
          </Link>

          {user && (
            <Link 
              href={getDashboardLink()} 
              style={{ 
                fontSize: '0.9rem', 
                fontWeight: 500, 
                color: pathname.includes('/dashboard') ? 'var(--text-primary)' : 'var(--text-secondary)' 
              }}
            >
              Dashboard
            </Link>
          )}

          {user?.role === 'patient' && (
            <>
              <Link 
                href="/patient/book" 
                style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: 500, 
                  color: pathname === '/patient/book' ? 'var(--text-primary)' : 'var(--text-secondary)' 
                }}
              >
                Book Visit
              </Link>
              <Link 
                href="/patient/queue" 
                style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: 500, 
                  color: pathname === '/patient/queue' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Clock size={16} /> Live Queue
              </Link>
            </>
          )}

          {user?.role === 'doctor' && (
            <>
              <Link 
                href="/doctor/queue" 
                style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: 500, 
                  color: pathname === '/doctor/queue' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Clock size={16} /> Queue Management
              </Link>
              <Link 
                href="/doctor/appointments" 
                style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: 500, 
                  color: pathname === '/doctor/appointments' ? 'var(--text-primary)' : 'var(--text-secondary)' 
                }}
              >
                Requests
              </Link>
            </>
          )}

          {user?.role === 'receptionist' && (
            <>
              <Link 
                href="/receptionist/check-in" 
                style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: 500, 
                  color: pathname === '/receptionist/check-in' ? 'var(--text-primary)' : 'var(--text-secondary)' 
                }}
              >
                Check-In Desk
              </Link>
              <Link 
                href="/receptionist/walk-in" 
                style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: 500, 
                  color: pathname === '/receptionist/walk-in' ? 'var(--text-primary)' : 'var(--text-secondary)' 
                }}
              >
                Walk-In Entry
              </Link>
            </>
          )}

          {user?.role === 'admin' && (
            <>
              <Link 
                href="/admin/users" 
                style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: 500, 
                  color: pathname === '/admin/users' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Users size={16} /> Users
              </Link>
              <Link 
                href="/admin/audit-logs" 
                style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: 500, 
                  color: pathname === '/admin/audit-logs' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <ClipboardList size={16} /> Audit Logs
              </Link>
            </>
          )}
        </nav>

        {/* User Actions */}
        <div style={{ display: 'none', alignItems: 'center', gap: '0.85rem' }} className="desktop-actions">
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
              }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user.name}</span>
                <span style={{ 
                  fontSize: '0.725rem', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.04em',
                  color: 'var(--accent-primary)',
                  fontWeight: 600
                }}>
                  {user.role}
                </span>
              </div>
              <button 
                onClick={handleLogout} 
                className="btn btn-secondary btn-sm"
                title="Sign out of your account"
              >
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link href="/login" className="btn btn-secondary btn-sm">
                <LogIn size={15} /> Sign In
              </Link>
              <Link href="/register" className="btn btn-primary btn-sm">
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="mobile-toggle"
          aria-label="Toggle navigation menu"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.5rem',
            color: 'var(--text-primary)',
          }}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          borderTop: '1px solid var(--border-subtle)',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          <Link href="/doctors" onClick={() => setMobileMenuOpen(false)}>Find a Doctor</Link>
          {user && <Link href={getDashboardLink()} onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>}
          {user?.role === 'patient' && (
            <>
              <Link href="/patient/book" onClick={() => setMobileMenuOpen(false)}>Book Visit</Link>
              <Link href="/patient/queue" onClick={() => setMobileMenuOpen(false)}>Live Queue</Link>
            </>
          )}
          {user?.role === 'doctor' && (
            <>
              <Link href="/doctor/queue" onClick={() => setMobileMenuOpen(false)}>Queue Management</Link>
              <Link href="/doctor/appointments" onClick={() => setMobileMenuOpen(false)}>Requests</Link>
            </>
          )}
          {user?.role === 'receptionist' && (
            <>
              <Link href="/receptionist/check-in" onClick={() => setMobileMenuOpen(false)}>Check-In Desk</Link>
              <Link href="/receptionist/walk-in" onClick={() => setMobileMenuOpen(false)}>Walk-In Entry</Link>
            </>
          )}
          {user?.role === 'admin' && (
            <>
              <Link href="/admin/users" onClick={() => setMobileMenuOpen(false)}>Users</Link>
              <Link href="/admin/audit-logs" onClick={() => setMobileMenuOpen(false)}>Audit Logs</Link>
            </>
          )}
          
          <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
            {user ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{user.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)' }}>{user.role.toUpperCase()}</div>
                </div>
                <button onClick={handleLogout} className="btn btn-secondary btn-sm">
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Link href="/login" className="btn btn-secondary btn-sm" onClick={() => setMobileMenuOpen(false)}>
                  Sign In
                </Link>
                <Link href="/register" className="btn btn-primary btn-sm" onClick={() => setMobileMenuOpen(false)}>
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @media (min-width: 768px) {
          :global(.desktop-nav) {
            display: flex !important;
          }
          :global(.desktop-actions) {
            display: flex !important;
          }
          :global(.mobile-toggle) {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
