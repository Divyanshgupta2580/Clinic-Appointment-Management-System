import React from 'react';
import { AppointmentStatus, QueueStatus } from '@/types';
import { 
  Clock, 
  CalendarCheck, 
  UserCheck, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  UserX,
  AlertCircle
} from 'lucide-react';

interface StatusBadgeProps {
  status: AppointmentStatus | QueueStatus | string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = (status || '').toUpperCase();

  switch (normalized) {
    case 'PENDING':
      return (
        <span className="badge badge-pending">
          <Clock size={12} /> Pending Review
        </span>
      );
    case 'CONFIRMED':
      return (
        <span className="badge badge-confirmed">
          <CalendarCheck size={12} /> Confirmed
        </span>
      );
    case 'CHECKED_IN':
    case 'WAITING':
      return (
        <span className="badge badge-checked_in">
          <UserCheck size={12} /> Checked In
        </span>
      );
    case 'CALLED':
      return (
        <span className="badge badge-checked_in" style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}>
          <AlertCircle size={12} /> Called to Room
        </span>
      );
    case 'IN_PROGRESS':
    case 'IN_CONSULTATION':
      return (
        <span className="badge badge-in_progress">
          <Activity size={12} /> In Consultation
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="badge badge-completed">
          <CheckCircle2 size={12} /> Completed
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="badge badge-cancelled">
          <XCircle size={12} /> Cancelled
        </span>
      );
    case 'REJECTED':
      return (
        <span className="badge badge-rejected">
          <XCircle size={12} /> Declined
        </span>
      );
    case 'NO_SHOW':
      return (
        <span className="badge badge-no_show">
          <UserX size={12} /> No-Show
        </span>
      );
    default:
      return (
        <span className="badge">
          {status}
        </span>
      );
  }
}
