// Shared on every page: Gordon's bubble in the bottom-right corner.
// On the booking page it opens Gordon's panel (js/gordon.js); elsewhere it takes the guest there.
// Nothing plays or asks for anything until the guest clicks (R-12).
(function () {
  const bubble = document.createElement('button');
  bubble.className = 'gordon-bubble';
  bubble.id = 'gordon-bubble';
  bubble.type = 'button';
  bubble.setAttribute('aria-label', 'Open Gordon, the booking assistant');
  bubble.setAttribute('aria-expanded', 'false');
  bubble.innerHTML = '<span>Book by typing with Gordon</span><img src="images/gordon.png" alt="">';
  bubble.addEventListener('click', () => {
    if (window.Gordon) window.Gordon.toggle();
    else location.href = 'booking.html?gordon=1';
  });
  document.body.append(bubble);
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

// ---------- Passing the booking to the confirmation page (privacy) ----------
// WARNING: anything in sessionStorage, localStorage or IndexedDB can be read by EVERY script that runs
// on this site, including third-party scripts (analytics, ads, chat widgets, tag managers, a compromised
// CDN file). Encryption in the browser does not stop them: the key has to live in the same browser,
// and any script on the page can call the same decrypt function. So:
//   1. Do not add third-party scripts to these pages. Everything here (three.js too) is self-hosted.
//   2. Store as little as possible. The full name, full phone number, email, dietary/health needs and
//      notes are never stored. Only what the confirmation page shows is kept: first name, last 4 digits
//      of the phone, and how many dietary needs were noted.
//   3. That small record is encrypted (AES-GCM, Web Crypto API) before it goes into sessionStorage, so it
//      isn't readable as plain text by browser extensions or tools that dump storage. The key is created
//      as non-extractable and kept in IndexedDB, so it can't be copied out, only used on this site.
//   4. sessionStorage is wiped when the tab closes, and the key is replaced on every booking.
// In a real product the booking would go straight to the restaurant's server over HTTPS, and the
// confirmation page would ask the server for it instead of reading anything from the browser.
function minimizeBooking(b) {
  const digits = String(b.phone || '').replace(/\D/g, '');
  return {
    location: b.location, party: b.party, date: b.date, time: b.time, table: b.table,
    firstName: String(b.name || '').trim().split(/\s+/)[0] || '',
    phoneLast4: digits.slice(-4),
    dietCount: (b.dietary || []).length + (b.notes ? 1 : 0),
  };
}
const BookingVault = (() => {
  const DB = 'cc-vault', STORE = 'keys', KEY_ID = 'booking';
  const ok = () => !!(window.crypto && crypto.subtle && window.indexedDB);
  function db() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  }
  async function idb(mode, fn) {
    const d = await db();
    return new Promise((res, rej) => {
      const tx = d.transaction(STORE, mode), req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => res(req && req.result); tx.onerror = () => rej(tx.error);
    });
  }
  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const unb64 = (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function save(record) {
    // a fresh, non-extractable key for every booking
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    await idb('readwrite', st => st.put(key, KEY_ID));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(record)));
    sessionStorage.setItem('booking', JSON.stringify({ v: 1, iv: b64(iv), data: b64(data) }));
  }
  async function load() {
    const box = JSON.parse(sessionStorage.getItem('booking') || 'null');
    if (!box || box.v !== 1) return null;
    const key = await idb('readonly', st => st.get(KEY_ID));
    if (!key) return null;
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.data));
    return JSON.parse(new TextDecoder().decode(plain));
  }
  return { ok, save, load };
})();

// Saves only the minimized booking, encrypted. Returns a promise: wait for it before leaving the page.
async function saveBooking(b) {
  const record = minimizeBooking(b);
  try {
    if (BookingVault.ok()) return await BookingVault.save(record);
  } catch (e) { /* fall through */ }
  // No Web Crypto here (very old browser): nothing is stored, the confirmation page shows a generic message.
  try { sessionStorage.removeItem('booking'); } catch (e) {}
}
async function loadBooking() {
  try { return BookingVault.ok() ? await BookingVault.load() : null; } catch (e) { return null; }
}

// Waitlist link beside Reserve on every page (js/waitlist.js, R-4). Pages that need the waitlist
// numbers straight away (waitlist.html, confirmed.html) load it themselves; the others get it here.
document.addEventListener('DOMContentLoaded', () => {
  if (typeof Waitlist !== 'undefined' || document.querySelector('script[src="js/waitlist.js"]')) return;
  const s = document.createElement('script');
  s.src = 'js/waitlist.js';
  document.body.append(s);
});

// ---------- Site links (every page) ----------
// The page links at the bottom of every page. On phones the nav hides Menu / Hours / Private events,
// so this footer is how guests reach them there.
const PAGES = [
  ['index.html', 'Home'], ['menu.html', 'Menu'], ['hours.html', 'Hours & locations'],
  ['events.html', 'Private events'], ['booking.html', 'Reserve'],
];
(function () {
  const here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const main = document.querySelector('main');
  if (!main) return;
  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML = `<nav aria-label="Site pages">${PAGES.map(([href, label]) =>
    `<a href="${href}"${href === here ? ' aria-current="page"' : ''}>${esc(label)}</a>`).join('')}</nav>`;
  main.after(footer);
})();

// ---------- Reserve from any page (F02 Choose location) ----------
// Pages with a [data-open-locations] button get the same "Which location?" pop-up as the home page.
// A [data-reserve-loc="Oshawa"] button skips the pop-up and goes straight to booking for that location.
// The home page builds its own pop-up, so nothing is added there.
(function () {
  document.querySelectorAll('[data-reserve-loc]').forEach(b => b.addEventListener('click', () => {
    const loc = b.getAttribute('data-reserve-loc');
    setLocation(loc);
    location.href = 'booking.html?loc=' + encodeURIComponent(loc);
  }));
  const openers = document.querySelectorAll('[data-open-locations]');
  if (!openers.length || document.getElementById('locations')) return;
  const dlg = document.createElement('dialog');
  dlg.id = 'locations';
  dlg.setAttribute('aria-labelledby', 'loc-title');
  dlg.innerHTML = `
    <form method="dialog" id="loc-form">
      <div class="dialog-head">
        <h2 id="loc-title">Which location?</h2>
        <button class="link-btn" value="cancel" formnovalidate>Close</button>
      </div>
      ${Object.keys(LOCATIONS).map(k => `
      <label class="loc-option">
        <input type="radio" name="loc" value="${k}">
        <span><strong>${esc(LOCATIONS[k].city)}</strong><br>${esc(LOCATIONS[k].address.split(',')[0])} · Tue to Sun 9 am to 1:30 pm</span>
      </label>`).join('')}
      <p><button type="button" class="btn btn-primary" id="loc-continue" disabled>Continue to booking</button></p>
    </form>`;
  document.body.append(dlg);
  const cont = dlg.querySelector('#loc-continue');
  openers.forEach(b => b.addEventListener('click', () => dlg.showModal()));
  dlg.addEventListener('change', () => { cont.disabled = false; });
  const remembered = getLocation();
  if (remembered) { dlg.querySelector(`input[value="${remembered}"]`).checked = true; cont.disabled = false; }
  cont.addEventListener('click', () => {
    const loc = dlg.querySelector('input[name=loc]:checked').value;
    setLocation(loc);
    location.href = 'booking.html?loc=' + encodeURIComponent(loc);
  });
})();

// Google Maps directions to a location (opens in a new tab).
function directionsUrl(loc) {
  return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(LOCATIONS[loc].address);
}
