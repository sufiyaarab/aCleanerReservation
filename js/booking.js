// Booking page logic (frames F03 to F09). Availability is FAKE demo data, no backend.
//   - Mondays are fully booked, so picking a Monday shows F06.
//   - Two time slots per date/location are "taken". Pick one as your time to see F05.

const $ = (id) => document.getElementById(id);

const booking = {
  location: new URLSearchParams(location.search).get('loc') || 'Oshawa',
  party: 2,
  date: '',
  time: '',
  table: null,      // e.g. "Table 6, low table by the windows" or "No preference"
  dietary: [],
  notes: '',
};

// ---------- helpers ----------
const TIMES = ['9:00 am', '9:30 am', '10:00 am', '10:30 am', '11:00 am', '11:30 am',
               '12:00 pm', '12:30 pm', '1:00 pm', '1:30 pm'];

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
function prettyDate(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
}
function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function hash(str) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}
function isClosed(iso) { return new Date(iso + 'T12:00:00').getDay() === 1; } // closed Mondays
// FAKE: every date whose day number is a multiple of 7 (Nov 7, 14, 21, 28) is fully booked, to demo F06
function isFullyBooked(iso) { return Number(iso.slice(8, 10)) % 7 === 0; }
function nextOpenDay(iso) { let d = addDays(iso, 1); while (isClosed(d) || isFullyBooked(d)) d = addDays(d, 1); return d; }
function takenTimes(iso, loc) {
  const h = hash(iso + loc);
  return [TIMES[h % TIMES.length], TIMES[(h >> 4) % TIMES.length]];
}

function unlock(stepId) {
  const s = $(stepId);
  s.classList.remove('locked');
  s.querySelector('.body').hidden = false;
  s.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderSummary() {
  const items = [];
  items.push(booking.location);
  items.push('Party of ' + booking.party);
  if (booking.date) items.push(prettyDate(booking.date));
  if (booking.time) items.push(booking.time);
  if (booking.table) items.push(booking.table);
  if (booking.dietary.length) items.push(booking.dietary.join(', '));
  $('summary').innerHTML = items.map(i => '<li>' + i + '</li>').join('');
  $('loc-label').textContent = booking.location;
  document.querySelectorAll('.loc-name').forEach(e => e.textContent = booking.location);
  $('grat-note').textContent = gratuityNote(booking.party);
  document.querySelectorAll('.loc-phone').forEach(e => e.textContent = LOCATIONS[booking.location].phone);
}

// ---------- F03 step 1 ----------
$('loc').value = booking.location;
$('date').min = todayISO();          // past dates disabled
booking.date = isClosed(todayISO()) ? addDays(todayISO(), 1) : todayISO(); // default today (Tuesday if today is Monday)
$('date').value = booking.date;
TIMES.forEach(t => $('time').add(new Option(t, t)));

function updateFind() {
  const closed = isClosed(booking.date);
  $('date-help').textContent = closed ? "We're closed on Mondays. Please pick Tuesday to Sunday." : 'Open Tuesday to Sunday. Closed Mondays.';
  $('date-help').classList.toggle('notice', closed);
  $('find').disabled = !$('time').value || closed;
  $('find-help').hidden = !!$('time').value;
}
$('loc').addEventListener('change', e => { booking.location = e.target.value; renderSummary(); });
$('date').addEventListener('change', e => { booking.date = e.target.value; renderSummary(); updateFind(); });
$('time').addEventListener('change', updateFind);
$('party-minus').addEventListener('click', () => { if (booking.party > 1) booking.party--; $('party').textContent = booking.party; renderSummary(); });
$('party-plus').addEventListener('click', () => { if (booking.party < POLICY.maxOnline) booking.party++; $('party').textContent = booking.party; renderSummary(); });

$('find').addEventListener('click', search);

// ---------- F04 / F05 / F06 step 2 ----------
function search() {
  unlock('step2');
  ['times-ok', 'times-full', 'times-none'].forEach(id => $(id).hidden = true);
  $('loading').hidden = false;
  setTimeout(showResults, 600); // pretend to check
}

function showResults() {
  $('loading').hidden = true;
  const wanted = $('time').value;

  // F06: nothing free that day
  if (isFullyBooked(booking.date)) {
    const next = nextOpenDay(booking.date);
    $('none-msg').textContent = `We're fully booked at ${booking.location} on ${prettyDate(booking.date)}.`;
    $('try-next').textContent = 'Try ' + prettyDate(next);
    $('try-next').onclick = () => { $('date').value = booking.date = next; renderSummary(); updateFind(); search(); };
    const other = booking.location === 'Oshawa' ? 'Toronto' : 'Oshawa';
    $('try-other-loc').textContent = `Check ${other} instead`;
    $('try-other-loc').onclick = () => { $('loc').value = booking.location = other; renderSummary(); search(); };
    $('times-none').hidden = false;
    return;
  }

  const taken = takenTimes(booking.date, booking.location);

  // F05: the chosen time is full, offer nearest earlier and later
  if (taken.includes(wanted)) {
    const i = TIMES.indexOf(wanted);
    const earlier = TIMES.slice(0, i).reverse().find(t => !taken.includes(t));
    const later = TIMES.slice(i + 1).find(t => !taken.includes(t));
    $('full-msg').textContent = `${wanted} is full. The closest times are:`;
    $('near-chips').innerHTML = '';
    [earlier, later].filter(Boolean).forEach(t => {
      const b = document.createElement('button');
      b.className = 'chip'; b.textContent = t;
      b.onclick = () => { $('time').value = t; pickTime(t); showChips(taken); };
      $('near-chips').append(b);
    });
    $('times-full').hidden = false;
    return;
  }

  // F04: times available, the wanted one pre-selected
  pickTime(wanted);
  showChips(taken);
}

function showChips(taken) {
  $('times-full').hidden = true;
  $('chips').innerHTML = '';
  TIMES.forEach(t => {
    const b = document.createElement('button');
    b.className = 'chip' + (t === booking.time ? ' selected' : '');
    b.textContent = t;
    b.disabled = taken.includes(t);
    b.onclick = () => { pickTime(t); showChips(taken); };
    $('chips').append(b);
  });
  $('times-ok').hidden = false;
}

function pickTime(t) {
  booking.time = t;
  $('open-plan').disabled = false;
  renderSummary();
}
document.querySelector('[data-go-date]').addEventListener('click', () => { $('step1').scrollIntoView({ behavior: 'smooth' }); $('date').focus(); });

// ---------- F07 seating and table (pop-up) ----------
const TABLES = [
  // n, height, shape, x, y, seats, where
  [1, 'Low', 'round', 40, 50, '2', 'by the windows'],
  [2, 'Low', 'round', 140, 50, '2', 'by the windows'],
  [3, 'Low', 'square', 240, 50, '2 to 4', 'by the windows'],
  [4, 'Low', 'square', 340, 50, '2 to 4', 'by the windows'],
  [5, 'High', 'round', 460, 70, '2', 'at the bar'],
  [6, 'High', 'round', 460, 160, '2', 'at the bar'],
  [7, 'High', 'round', 460, 250, '2', 'at the bar'],
  [8, 'Low', 'square', 60, 160, '4', 'in the middle'],
  [9, 'Low', 'square', 170, 160, '4', 'in the middle'],
  [10, 'Low', 'square', 280, 160, '4 to 6', 'in the middle'],
  [11, 'High', 'square', 370, 160, '4', 'near the bar'],
  [12, 'Low', 'round', 100, 260, '2', 'by the entrance'],
  [13, 'Low', 'square', 220, 260, '4 to 6', 'near the kitchen'],
  [14, 'High', 'square', 330, 260, '4', 'near the kitchen'],
];
let picked = null;
let filter = 'all';

function renderPlan() {
  const takenSet = new Set([hash(booking.date + booking.time) % 14 + 1, (hash(booking.time) >> 3) % 14 + 1]);
  $('floor').querySelectorAll('.table').forEach(e => e.remove());
  TABLES.forEach(([n, h, shape, x, y]) => {
    const b = document.createElement('button');
    const isTaken = takenSet.has(n);
    b.className = `table ${shape === 'round' ? 'round' : ''} ${isTaken ? 'taken' : ''} ${picked === n ? 'selected' : ''} ${filter !== 'all' && filter !== h ? 'filtered' : ''}`;
    b.style.left = x + 'px'; b.style.top = y + 'px';
    b.innerHTML = `${n}<br>${isTaken ? 'Taken' : h}`;
    b.disabled = isTaken || (filter !== 'all' && filter !== h);
    b.setAttribute('aria-label', `Table ${n}, ${h === 'High' ? 'high-top' : 'low table'}${isTaken ? ', taken' : ''}`);
    b.onclick = () => { picked = n; renderPlan(); };
    $('floor').append(b);
  });
  const t = TABLES.find(t => t[0] === picked);
  $('table-desc').textContent = t ? `Table ${t[0]}, ${t[1] === 'High' ? 'high-top' : 'low table'} ${t[6]}, seats ${t[5]}` : 'No table picked yet.';
  $('book-table').disabled = !t;
  $('book-table').textContent = t ? `Book table ${t[0]}` : 'Book this table';
  $('no-pref').textContent = filter === 'all' ? 'No preference' : `No preference, any ${filter === 'High' ? 'high-top' : 'low table'}`;
}

function openPlan() {
  $('plan-sub').textContent = `${prettyDate(booking.date)}, ${booking.time}, party of ${booking.party}, ${booking.location}`;
  renderPlan();
  $('plan').showModal();
}
function chooseTable(text) {
  booking.table = text;
  $('plan').close();
  $('seat-text').textContent = text;
  renderSummary();
  unlock('step3');
  unlock('step4');
}
$('open-plan').addEventListener('click', openPlan);
$('reopen-plan').addEventListener('click', openPlan);
$('plan-close').addEventListener('click', () => $('plan').close());
$('filter').addEventListener('click', e => {
  if (!e.target.dataset.filter) return;
  filter = e.target.dataset.filter;
  $('filter').querySelectorAll('.chip').forEach(c => c.classList.toggle('selected', c === e.target));
  const t = TABLES.find(t => t[0] === picked);
  if (t && filter !== 'all' && t[1] !== filter) picked = null;
  renderPlan();
});
$('book-table').addEventListener('click', () => chooseTable($('table-desc').textContent));
$('no-pref').addEventListener('click', () => chooseTable($('no-pref').textContent));

// ---------- F08 dietary needs ----------
$('diet-chips').addEventListener('click', e => {
  if (!e.target.classList.contains('chip')) return;
  e.target.setAttribute('aria-pressed', e.target.getAttribute('aria-pressed') !== 'true');
});
function finishDiet(skip) {
  booking.dietary = skip ? [] : [...$('diet-chips').querySelectorAll('[aria-pressed="true"]')].map(c => c.textContent);
  booking.notes = skip ? '' : $('notes').value.trim();
  renderSummary();
  renderReview();
  unlock('step5');
}
$('diet-continue').addEventListener('click', () => finishDiet(false));
$('diet-skip').addEventListener('click', () => finishDiet(true));

// ---------- F09 review and contact ----------
function renderReview() {
  const rows = [
    ['Location', booking.location, 'step1'],
    ['Date', prettyDate(booking.date), 'step1'],
    ['Time', booking.time, 'step2'],
    ['Party size', booking.party, 'step1'],
    ['Seating', booking.table, 'step3'],
    ['Dietary needs', [...booking.dietary, booking.notes].filter(Boolean).join(', ') || 'None', 'step4'],
  ];
  $('review').innerHTML = rows.map(([k, v, step]) =>
    `<dt>${k}</dt><dd>${v}</dd><button type="button" class="link-btn" data-edit="${step}">Edit</button>`).join('');
}
$('review').addEventListener('click', e => {
  const step = e.target.dataset.edit;
  if (!step) return;
  if (step === 'step3') return openPlan();
  $(step).scrollIntoView({ behavior: 'smooth' });
});

$('contact').addEventListener('submit', e => {
  e.preventDefault();
  const digits = $('phone').value.replace(/\D/g, '');
  const phoneOk = digits.length === 10;
  $('phone-field').classList.toggle('error', !phoneOk);
  $('phone-error').hidden = phoneOk;
  if (!$('name').value.trim()) { $('name').focus(); return; }
  if (!phoneOk) { $('phone').focus(); return; }

  saveBooking({ ...booking, name: $('name').value.trim(), phone: $('phone').value, email: $('email').value });
  location.href = 'confirmed.html';
});

renderSummary();
updateFind();
