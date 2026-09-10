/**
 * MediPulse Clinic - Real-Time WebSockets Client
 * Handles live event listeners, toast alerts, and real-time DOM status updates.
 */

(function () {
  if (typeof io === 'undefined') {
    return; // Socket.io client script not loaded on this page
  }

  const currentUser = window.CURRENT_USER || null;
  if (!currentUser) {
    return; // Guest user, no private rooms to subscribe
  }

  // Connect to Socket.IO passing user auth
  const socket = io({
    auth: {
      userId: currentUser.id,
      role: currentUser.role,
    },
  });

  socket.on('connect', () => {
    // Explicitly notify server of registration
    socket.emit('register:user', {
      userId: currentUser.id,
      role: currentUser.role,
    });
  });

  /**
   * Helper: Show toast notification in the UI
   */
  function showToast(title, message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');

    const iconMap = {
      success: '✓',
      warning: '⚠',
      danger: '✕',
      info: 'ℹ',
    };

    toast.innerHTML = `
      <span class="alert-icon" style="font-size: 1.25rem;">${iconMap[type] || 'ℹ'}</span>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    });

    container.appendChild(toast);

    // Auto-remove after 6 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }
    }, 6000);
  }

  /**
   * Helper: Update status badge in DOM if element exists
   */
  function updateAppointmentStatusInDOM(appointmentId, newStatus) {
    const badgeElements = document.querySelectorAll(`[data-appointment-id="${appointmentId}"] .badge, [data-appointment-badge="${appointmentId}"]`);
    
    badgeElements.forEach((badge) => {
      badge.className = `badge badge-${newStatus}`;
      badge.setAttribute('data-status', newStatus);

      const labels = {
        pending: 'Pending Review',
        accepted: 'Confirmed / Accepted',
        completed: 'Completed',
        rejected: 'Declined',
        cancelled: 'Cancelled',
      };

      badge.innerHTML = `<span class="badge-dot"></span> ${labels[newStatus] || newStatus}`;
    });

    // Hide or update action buttons if on doctor page
    const actionsContainer = document.querySelector(`[data-appointment-actions="${appointmentId}"]`);
    if (actionsContainer && (newStatus === 'completed' || newStatus === 'rejected' || newStatus === 'cancelled')) {
      actionsContainer.innerHTML = `<span class="text-muted" style="font-size:0.85rem;">No further actions</span>`;
    }
  }

  // EVENT: New appointment booked (Doctor & Admin room)
  socket.on('appointment:created', (data) => {
    showToast('New Appointment Booked!', data.message, 'info');

    // If on doctor dashboard or appointments list, reload or notify
    const tableBody = document.getElementById('appointmentsTableBody');
    if (tableBody) {
      // Optional: Add a highlight banner or fetch new list
      const alertBanner = document.createElement('div');
      alertBanner.className = 'alert alert-info';
      alertBanner.style.cursor = 'pointer';
      alertBanner.innerHTML = `<strong>🔔 Live Update:</strong> ${data.message} <span style="text-decoration:underline; margin-left: 0.5rem;">Click to refresh view</span>`;
      alertBanner.onclick = () => window.location.reload();
      tableBody.closest('.card')?.insertAdjacentElement('beforebegin', alertBanner);
    }
  });

  // EVENT: Appointment accepted (Patient room)
  socket.on('appointment:accepted', (data) => {
    showToast('Appointment Confirmed!', data.message, 'success');
    updateAppointmentStatusInDOM(data.appointmentId, 'accepted');
  });

  // EVENT: Appointment rejected (Patient room)
  socket.on('appointment:rejected', (data) => {
    showToast('Appointment Declined', data.message, 'danger');
    updateAppointmentStatusInDOM(data.appointmentId, 'rejected');
  });

  // EVENT: Appointment completed (Patient room)
  socket.on('appointment:completed', (data) => {
    showToast('Appointment Completed', data.message, 'success');
    updateAppointmentStatusInDOM(data.appointmentId, 'completed');
  });

  // EVENT: Appointment cancelled
  socket.on('appointment:cancelled', (data) => {
    showToast('Appointment Cancelled', data.message, 'warning');
    updateAppointmentStatusInDOM(data.appointmentId, 'cancelled');
  });
})();
