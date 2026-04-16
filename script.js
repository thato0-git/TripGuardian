const DRIVER_CHECKLIST = [
  "Check vehicle fuel/battery levels",
  "Phone charged (min 50%) & data active",
  "Doors locked & windows closed",
  "Emergency contacts accessible",
  "Verify passenger name/rating",
  "Personal items hidden from view",
  "Vehicle is in sound mechanical order"
];

const PASSENGER_CHECKLIST = [
  "Phone charged & data active",
  "Share car model/plate with family",
  "Verify driver/car matches app",
  "Sit in back seat",
  "Personal items held securely",
  "Emergency contacts ready",
  "Check child locks are not active"
];

const LS_EVENTS_KEY = 'safety_watch_v1';
const LS_HISTORY_KEY = 'safety_history_v1';

let events = [];
try {
  events = JSON.parse(localStorage.getItem(LS_EVENTS_KEY) || '[]');
} catch (e) {
  console.warn("Local storage access denied. Data will not persist.");
}

let tripHistory = [];
try {
  tripHistory = JSON.parse(localStorage.getItem(LS_HISTORY_KEY) || '[]');
} catch (e) {
  console.warn("History storage access denied.");
}
let editingId = null;
let currentChecklistState = [];

function renderEvents() { 
  const list = document.getElementById('event-list'); 
  if (events.length === 0) { 
    list.innerHTML = `<div style="text-align:center; color:var(--muted); padding:3rem; font-style:italic;">No active trips monitored.</div>`; 
    return; 
  } 
  const sorted = [...events].sort((a,b) => a.timestamp - b.timestamp); 
  list.innerHTML = sorted.map(e => { 
    const diff = e.timestamp - Date.now(); 
    const dateObj = new Date(e.timestamp); 
    const dateStr = dateObj.toLocaleDateString(undefined, { month:'long', day:'numeric' }); 
    const timeStr = dateObj.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); 
 
    return `
<div class="event-card ${diff < 0 ? 'past' : ''}">
<div class="role-badge">${e.role || 'Trip'}</div>
<div class="event-actions"> 
<button class="icon-btn" data-id="${e.id}" data-action="share" aria-label="Share trip details">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
</button>
<button class="icon-btn" data-id="${e.id}" data-action="edit" aria-label="Edit trip">✎</button> 
</div> 
<span class="event-meta-top">${dateStr} at ${timeStr}</span>
<!-- Use textContent style approach or escape HTML for security --> 
<div class="event-name serif">${escapeHtml(e.name)}</div> 
<div class="event-timer-container" data-ts="${e.timestamp}">${getTimerHTML(diff)}</div> 
        ${e.notes ? ` 
<div class="notes-container"> 
<div class="notes-trigger">Security Details <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"></polyline></svg></div> 
<div class="notes-content">${escapeHtml(e.notes)}</div> 
</div> 
        ` : ''} 
<button class="btn-checkin" data-id="${e.id}" data-action="checkin">
  I'm Safe / Check-in
</button>
</div> 
    `; 
  }).join(''); 
} 

function renderHistory() {
  const container = document.getElementById('history-list');
  if (!container) return;
  if (tripHistory.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--muted); padding:1rem; font-size:0.8rem; font-style:italic;">No records found.</div>`;
    return;
  }
  const reversed = [...tripHistory].reverse(); // Show newest safe arrivals first
  container.innerHTML = reversed.map(h => `
    <div class="history-item">
      <div class="role-badge" style="margin-bottom: 0.25rem; font-size: 0.5rem;">${h.role || 'Trip'}</div>
      <strong>${escapeHtml(h.name)}</strong>
      <div style="font-size: 0.75rem; color: var(--muted);">
        Safe Arrival at: ${new Date(h.completedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} on ${new Date(h.completedAt).toLocaleDateString()}
        ${h.alarmActivated ? '<span style="color: #ff4d4d; font-weight: 700; margin-left: 0.5rem;">(Alarm Activated)</span>' : ''}
      </div>
      ${h.notes ? `<div style="font-size: 0.8rem; color: var(--muted); margin-top: 0.5rem;">Notes: ${escapeHtml(h.notes)}</div>` : ''}
    </div>
  `).join('');
}

function getTimerHTML(ms) { 
if (ms < 0) {
  const absMs = Math.abs(ms);
  const d = Math.floor(absMs / 86400000); 
  const h = Math.floor((absMs % 86400000) / 3600000); 
  const m = Math.floor((absMs % 3600000) / 60000); 
  const s = Math.floor((absMs % 60000) / 1000); 
  return `<div class="event-timer" style="color:#ff4d4d; font-size: 1.2rem; font-weight: 800;">
    OVERDUE: ${d > 0 ? d + 'd ' : ''}${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}
  </div>`;
}
const d = Math.floor(ms / 86400000); 
const h = Math.floor((ms % 86400000) / 3600000); 
const m = Math.floor((ms % 3600000) / 60000); 
const s = Math.floor((ms % 60000) / 1000); 
return ` 
<div class="event-timer"> 
<div class="timer-segment"><span class="timer-val">${d}</span><span class="timer-label">Days</span></div> 
<div class="timer-segment"><span class="timer-val">${h.toString().padStart(2,'0')}</span><span class="timer-label">Hrs</span></div> 
<div class="timer-segment"><span class="timer-val">${m.toString().padStart(2,'0')}</span><span class="timer-label">Min</span></div> 
<div class="timer-segment"><span class="timer-val">${s.toString().padStart(2,'0')}</span><span class="timer-label">Sec</span></div> 
</div> 
`; 
} 
function openModal(id = null) { 
editingId = id; 
const e = id ? events.find(x => x.id === id) : null; 

document.getElementById('modal-title').textContent = id ? "Update Trip" : "New Trip Monitor"; 

if (!id) { // New trip
  document.getElementById('inp-name').value = '';
  document.getElementById('inp-role').value = ''; // Reset dropdown to placeholder
  const now = new Date();
  document.getElementById('inp-date').value = now.toISOString().split('T')[0];
  document.getElementById('inp-time').value = now.toTimeString().slice(0, 5);
  document.getElementById('inp-notes').value = '';
  currentChecklistState = []; // Clear checklist state
  document.getElementById('checklist-wrapper').style.display = 'none';
  document.getElementById('checklist-placeholder').style.display = 'block';
} else { // Editing existing trip
  document.getElementById('inp-name').value = e.name;
  document.getElementById('inp-role').value = e.role;
  const d = new Date(e.timestamp);
  document.getElementById('inp-date').value = d.toISOString().split('T')[0];
  document.getElementById('inp-time').value = d.toTimeString().slice(0, 5);
  document.getElementById('inp-notes').value = e.notes;
  currentChecklistState = e.checklist || [];
  document.getElementById('checklist-wrapper').style.display = 'block'; // Always show wrapper for existing trip
  document.getElementById('checklist-placeholder').style.display = 'none'; // Hide placeholder for existing trip
  renderChecklist(); // Render checklist for existing trip
}

document.getElementById('overlay').scrollTop = 0; // Scroll to top on open
document.getElementById('overlay').classList.add('active');
} 
function closeModal() { document.getElementById('overlay').classList.remove('active'); } 
function toggleNotes(el) { el.classList.toggle('expanded'); } 
  
function handleRoleChange() {
  const role = document.getElementById('inp-role').value;
  const items = role === 'driver' ? DRIVER_CHECKLIST : PASSENGER_CHECKLIST;
  currentChecklistState = items.map(text => ({ text, checked: false })); // Always reset checked state for new role selection
  renderChecklist();
  document.getElementById('checklist-wrapper').style.display = 'block';
  document.getElementById('checklist-placeholder').style.display = 'none';
}

function renderChecklist() {
  const container = document.getElementById('checklist-items');
  container.innerHTML = currentChecklistState.map((item, idx) => `
    <div class="checklist-item ${item.checked ? 'checked' : ''}"> 
      <input type="checkbox" id="check-${idx}" ${item.checked ? 'checked' : ''} data-idx="${idx}"> 
      <label for="check-${idx}">${item.text}</label>
    </div>
  `).join('');
  updateProgress();
}

function toggleCheckItem(idx) {
  currentChecklistState[idx].checked = !currentChecklistState[idx].checked;
  // Re-render to apply 'checked' class for styling
  renderChecklist(); 
  updateProgress();
}

function updateProgress() {
  const total = currentChecklistState.length;
  const checked = currentChecklistState.filter(i => i.checked).length;
  const percent = total > 0 ? Math.round((checked / total) * 100) : 0;
  
  document.getElementById('checklist-progress-bar').style.width = percent + '%';
  document.getElementById('checklist-progress-text').textContent = percent + '%';
}

function saveEvent() { 
  const name = document.getElementById('inp-name').value.trim(); 
  const dateVal = document.getElementById('inp-date').value; 
  const timeVal = document.getElementById('inp-time').value || "00:00"; 
  const notes = document.getElementById('inp-notes').value.trim();
  const role = document.getElementById('inp-role').value;

  if (!name || !dateVal || !role) {
    alert("Please fill in the Name, Date, and Role.");
    return; 
  }
  
  const allChecked = currentChecklistState.every(i => i.checked);
  if (!allChecked && !confirm("The safety checklist is incomplete. Proceed anyway?")) {
    return;
  }

  // Using a more robust date construction for cross-browser stability
  // dateVal is YYYY-MM-DD, timeVal is HH:MM. Combined as YYYY-MM-DDTHH:MM
  const timestamp = new Date(`${dateVal}T${timeVal}`).getTime();
  if (isNaN(timestamp)) { alert("Invalid date or time."); return; }

  if (editingId) { 
    const idx = events.findIndex(x => x.id === editingId); 
    events[idx] = { ...events[idx], name, timestamp, notes, role, checklist: currentChecklistState }; 
  } else {
    events.push({ id: Math.random().toString(36).substr(2,9), name, timestamp, notes, role, checklist: currentChecklistState });
  }
  localStorage.setItem(LS_EVENTS_KEY, JSON.stringify(events)); 
  renderEvents(); closeModal(); 
} 
 
/**
 * Simple HTML Escaper for Security
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Generates a pre-filled WhatsApp message for CPF/Family sharing
 * supporting the "Virtual Escort" philosophy.
 */
function shareTrip(id) {
  const trip = events.find(x => x.id === id);
  if (!trip) return;
  const timeStr = new Date(trip.timestamp).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const text = `*Safety Check-in*\n*Traveler:* ${trip.name} (${trip.role})\n*ETA:* ${timeStr}\n*Route/Notes:* ${trip.notes || 'No specific notes'}\n\n_Monitoring via Safe-Home Monitor_`;
  
  const encodedText = encodeURIComponent(text);
  window.open(`https://wa.me/?text=${encodedText}`, '_blank');
}
  
function deleteEvent(id) {
  const trip = events.find(x => x.id === id);
  if (trip) {
    const wasOverdue = (trip.timestamp - Date.now()) < 0;
    const historyItem = { ...trip, completedAt: Date.now(), alarmActivated: wasOverdue };
    tripHistory.push(historyItem);
    localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(tripHistory));
  }
  events = events.filter(event => event.id !== id); 
  localStorage.setItem(LS_EVENTS_KEY, JSON.stringify(events)); 
  renderEvents(); 
  renderHistory();
} 

function clearHistory() {
  if (confirm("Are you sure you want to clear the entire history log?")) {
    tripHistory = [];
    localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(tripHistory));
    renderHistory();
  }
}
  
window.addEventListener('DOMContentLoaded', () => {
  // Initialize event listeners
  document.getElementById('new-trip-btn').addEventListener('click', () => openModal());
  document.getElementById('inp-role').addEventListener('change', handleRoleChange);
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('modal-save-btn').addEventListener('click', saveEvent);
  document.getElementById('clear-history-btn').addEventListener('click', clearHistory);
  document.getElementById('overlay').addEventListener('click', (event) => {
    if (event.target === document.getElementById('overlay')) closeModal();
  });

  // Delegate event listeners for dynamically created elements
  document.getElementById('event-list').addEventListener('click', (event) => {
    const target = event.target;
    const card = target.closest('.event-card');
    
    if (target.closest('.icon-btn[data-action="share"]')) {
      shareTrip(target.closest('.icon-btn').dataset.id);
      event.stopPropagation(); // Prevent card from toggling notes
    } else if (target.closest('.icon-btn[data-action="edit"]')) {
      openModal(target.closest('.icon-btn').dataset.id);
      event.stopPropagation(); // Prevent card from toggling notes
    } else if (target.closest('.btn-checkin[data-action="checkin"]')) {
      deleteEvent(target.closest('.btn-checkin').dataset.id);
      event.stopPropagation(); // Prevent card from toggling notes
    } else if (card && !target.closest('button')) { // Only toggle notes if not clicking a button
      toggleNotes(card);
    }
  });

  // Delegate event listener for checklist items within the modal
  document.getElementById('checklist-items').addEventListener('change', (event) => {
    const target = event.target;
    if (target.matches('input[type="checkbox"]')) {
      toggleCheckItem(parseInt(target.dataset.idx));
    }
  });

  renderEvents(); 
  renderHistory();
  setInterval(() => { 
    let anyOverdue = false;
    const containers = document.querySelectorAll('.event-timer-container');
    containers.forEach(el => { 
      const diff = parseInt(el.dataset.ts) - Date.now();
      if (diff < 0) {
        anyOverdue = true;
        const card = el.closest('.event-card');
        if (card && !card.classList.contains('past')) card.classList.add('past');
      } else {
        el.closest('.event-card')?.classList.remove('past');
      }
      el.innerHTML = getTimerHTML(diff); 
    }); 
    
    const audio = document.getElementById('alert-sound');
    if (anyOverdue) {
      if (audio.paused) audio.play().catch(() => {
        // Browsers block audio until the user interacts with the page.
        // This catch handles that restriction silently.
      });
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, 1000); 
}); 
