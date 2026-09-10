/**
 * MediPulse Clinic - Dynamic Slot Picker
 * Fetches available time slots for chosen date and doctor
 */

document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('appointmentDate');
  const slotsContainer = document.getElementById('slotsContainer');
  const timeInput = document.getElementById('appointmentTime');
  const bookSubmitBtn = document.getElementById('bookSubmitBtn');
  const slotMessage = document.getElementById('slotMessage');

  if (!dateInput || !slotsContainer || !timeInput) {
    return; // Not on booking page
  }

  const doctorId = dateInput.getAttribute('data-doctor-id');

  // Set minimum date to today
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  dateInput.min = `${yyyy}-${mm}-${dd}`;

  async function loadSlots(dateStr, preselectedTime = null) {
    if (!dateStr) return;

    slotsContainer.innerHTML = '<p class="text-muted" style="grid-column: 1/-1; padding: 1rem 0;">Checking doctor availability...</p>';
    if (slotMessage) slotMessage.textContent = '';
    if (bookSubmitBtn) bookSubmitBtn.disabled = true;

    try {
      const res = await fetch(`/api/doctors/${doctorId}/available-slots?date=${encodeURIComponent(dateStr)}`);
      const data = await res.json();

      if (!data.success) {
        slotsContainer.innerHTML = `<p class="text-muted" style="grid-column: 1/-1; color: var(--danger);">${data.message || 'Error loading slots.'}</p>`;
        return;
      }

      if (!data.isAvailableDay) {
        slotsContainer.innerHTML = '<p class="text-muted" style="grid-column: 1/-1; color: var(--warning);">The doctor is not scheduled to consult on this day of the week. Please select another date.</p>';
        return;
      }

      if (!data.allSlots || data.allSlots.length === 0) {
        slotsContainer.innerHTML = '<p class="text-muted" style="grid-column: 1/-1;">No consultation slots configured for this date.</p>';
        return;
      }

      slotsContainer.innerHTML = '';

      let hasAvailableSlot = false;

      data.allSlots.forEach((slotTime) => {
        const isOccupied = data.occupiedSlots.includes(slotTime);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `slot-btn ${isOccupied ? 'is-taken' : ''}`;
        btn.textContent = slotTime;
        btn.setAttribute('data-time', slotTime);

        if (isOccupied) {
          btn.disabled = true;
          btn.title = 'Slot already booked';
        } else {
          hasAvailableSlot = true;
          if (preselectedTime === slotTime) {
            btn.classList.add('is-selected');
            timeInput.value = slotTime;
            if (bookSubmitBtn) bookSubmitBtn.disabled = false;
          }

          btn.addEventListener('click', () => {
            document.querySelectorAll('.slot-btn').forEach((b) => b.classList.remove('is-selected'));
            btn.classList.add('is-selected');
            timeInput.value = slotTime;
            if (bookSubmitBtn) bookSubmitBtn.disabled = false;
            if (slotMessage) slotMessage.textContent = `Selected slot: ${slotTime}`;
          });
        }

        slotsContainer.appendChild(btn);
      });

      if (!hasAvailableSlot) {
        if (slotMessage) {
          slotMessage.innerHTML = '<span style="color: var(--danger);">All slots on this date are fully booked.</span>';
        }
      }
    } catch (err) {
      console.error('[Booking] Slot fetch error:', err);
      slotsContainer.innerHTML = '<p class="text-muted" style="grid-column: 1/-1; color: var(--danger);">Failed to load doctor slots. Please check your connection.</p>';
    }
  }

  dateInput.addEventListener('change', (e) => {
    timeInput.value = '';
    loadSlots(e.target.value);
  });

  // If initial date has value, load slots immediately
  if (dateInput.value) {
    const initialTime = timeInput.value || (new URLSearchParams(window.location.search)).get('time');
    loadSlots(dateInput.value, initialTime);
  }
});
