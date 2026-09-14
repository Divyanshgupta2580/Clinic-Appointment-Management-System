import React from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Home, Stethoscope } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="app-container" style={{ textAlign: 'center', padding: '6rem 1.5rem' }}>
      <div style={{
        width: '4rem',
        height: '4rem',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--bg-surface-elevated)',
        border: '1px solid var(--border-medium)',
        color: 'var(--status-pending)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 1.5rem',
      }}>
        <AlertCircle size={32} />
      </div>

      <h1 className="h1-title" style={{ marginBottom: '0.75rem' }}>Page Not Found</h1>
      <p className="subtitle" style={{ maxWidth: '480px', margin: '0 auto 2rem' }}>
        The clinical portal page you are attempting to access could not be found or has been relocated.
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <Link href="/" className="btn btn-primary">
          <Home size={16} /> Return to Homepage
        </Link>
        <Link href="/doctors" className="btn btn-secondary">
          <Stethoscope size={16} /> Doctor Directory
        </Link>
      </div>
    </div>
  );
}
