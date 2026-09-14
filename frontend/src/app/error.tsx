'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring if configured
  }, [error]);

  return (
    <div className="app-container" style={{ textAlign: 'center', padding: '6rem 1.5rem' }}>
      <div style={{
        width: '4rem',
        height: '4rem',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--status-cancelled-bg)',
        border: '1px solid rgba(244, 63, 94, 0.3)',
        color: 'var(--status-cancelled)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 1.5rem',
      }}>
        <AlertTriangle size={32} />
      </div>

      <h1 className="h1-title" style={{ marginBottom: '0.75rem' }}>An Unexpected Error Occurred</h1>
      <p className="subtitle" style={{ maxWidth: '480px', margin: '0 auto 2rem' }}>
        We encountered a problem loading this medical portal view. Please retry or return to the main dashboard.
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button onClick={() => reset()} className="btn btn-primary">
          <RefreshCw size={16} /> Try Again
        </button>
        <Link href="/" className="btn btn-secondary">
          <Home size={16} /> Return to Homepage
        </Link>
      </div>
    </div>
  );
}
