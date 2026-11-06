// Shared on every page: the Gordon placeholder bubble.
// Gordon himself is not built yet; this only reserves his spot (bottom-right).
(function () {
  const bubble = document.createElement('button');
  bubble.className = 'gordon-bubble';
  bubble.type = 'button';
  bubble.setAttribute('aria-label', 'Open Gordon, the booking assistant');
  bubble.innerHTML = '<span>Book by talking or typing</span><img src="images/gordon.png" alt="">';

  const panel = document.createElement('div');
  panel.className = 'gordon-panel';
  panel.hidden = true;
  panel.innerHTML =
    '<strong>Gordon</strong> (placeholder)' +
    '<p>Gordon will live here: captions, a mic button, a text box and a close button.</p>' +
    '<button type="button" class="btn">Close</button>';

  bubble.addEventListener('click', () => { panel.hidden = !panel.hidden; });
  panel.querySelector('button').addEventListener('click', () => { panel.hidden = true; });

  document.body.append(panel, bubble);
})();

// The two locations. Change details here and every page picks them up.
const LOCATIONS = {
  'Oshawa': { city: 'Oshawa, Ontario', address: '124 Mockingbird Lane, Oshawa, ON L1H 7K4', phone: '(905) 555-0143' },
  'Toronto': { city: 'Toronto, Ontario', address: '890 Nonexistent Avenue, Toronto, ON M5V 2H1', phone: '(416) 555-0198' },
};

// Policies (from the team's Reservation, Gratuity & Cancellation Policy).
const POLICY = {
  hours: 'Tuesday to Sunday, 9 am to 1:30 pm. Closed Mondays.',
  maxOnline: 8,
  groupsEmail: 'groups@cravesandcrumble.com',
  cancelHours: 4,
  graceMinutes: 15,
};
function gratuityNote(party) {
  if (party >= 6) return 'An 18% gratuity is added for parties of 6 or more.';
  return 'Gratuity is at your discretion.';
}

// Escape text the guest typed before putting it into HTML.
function esc(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// The chosen location is remembered for the session (R-3).
function getLocation() {
  let loc = null;
  try { loc = sessionStorage.getItem('location'); } catch (e) {}
  return LOCATIONS[loc] ? loc : null;
}
function setLocation(loc) {
  try { sessionStorage.setItem('location', loc); } catch (e) {}
}

// Small helper to share the booking between pages.
function saveBooking(b) {
  try { sessionStorage.setItem('booking', JSON.stringify(b)); } catch (e) {}
}
function loadBooking() {
  try { return JSON.parse(sessionStorage.getItem('booking')) || null; } catch (e) { return null; }
}
