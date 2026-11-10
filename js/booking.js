// Booking page logic (frames F03 to F09). Availability is FAKE demo data, no backend.
//   - Closed Mondays (can't search).
//   - Fully booked (F06): any date whose day number is a multiple of 7 (Nov 7, 14, 21, 28).
//   - Two times per date and location are taken. Pick one in step 1 to see F05.
//   - Today's times that have already passed can't be picked.

const $ = (id) => document.getElementById(id);

// ---------- state ----------
const urlLoc = new URLSearchParams(location.search).get('loc');
const booking = {
  location: LOCATIONS[urlLoc] ? urlLoc : (getLocation() || 'Oshawa'),
  party: 2,
  date: '',
  time: '',
  table: '',        // e.g. "Table 6, low table by the windows, seats 1 to 2" or "No preference"
  dietary: [],
  notes: '',
};
setLocation(booking.location);
let current = 1;        // the open step
let dietDone = false;   // step 4 finished at least once

// ---------- dates and times ----------
const TIMES = ['9:00 am', '9:30 am', '10:00 am', '10:30 am', '11:00 am', '11:30 am',
               '12:00 pm', '12:30 pm', '1:00 pm', '1:30 pm'];

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
function prettyDate(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
}
function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function minutesOf(t) { // "1:30 pm" -> 810
  const [, h, m, ap] = t.match(/(\d+):(\d+) (am|pm)/);
  return (Number(h) % 12 + (ap === 'pm' ? 12 : 0)) * 60 + Number(m);
}
function hash(str) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}
const isClosed = (iso) => new Date(iso + 'T12:00:00').getDay() === 1;      // Mondays
const isFullyBooked = (iso) => Number(iso.slice(8, 10)) % 7 === 0;         // FAKE, demos F06
function isPast(iso, t) {
  if (iso < todayISO()) return true;
  if (iso > todayISO()) return false;
  const now = new Date();
  return minutesOf(t) <= now.getHours() * 60 + now.getMinutes();
}
const openTimes = (iso) => TIMES.filter(t => !isPast(iso, t));
function nextOpenDay(iso) {
  let d = addDays(iso, 1);
  while (isClosed(d) || isFullyBooked(d) || !openTimes(d).length) d = addDays(d, 1);
  return d;
}
function takenTimes(iso, loc) {
  const h = hash(iso + loc);
  return [TIMES[h % TIMES.length], TIMES[(h >> 4) % TIMES.length]];
}

// ---------- steps: done (folded to one line), open, locked ----------
function stepLine(n) {
  if (n === 1) return `${booking.location} · Party of ${booking.party} · ${prettyDate(booking.date)}`;
  if (n === 2) return booking.time;
  if (n === 3) return booking.table;
  if (n === 4) return [...booking.dietary, booking.notes].filter(Boolean).join(', ') || 'None';
  return '';
}
function goTo(n, scroll = true) {
  current = n;
  document.querySelectorAll('.step').forEach(sec => {
    const i = Number(sec.dataset.step);
    sec.classList.toggle('done', i < n);
    sec.classList.toggle('locked', i > n);
    sec.querySelector('.done-line') && (sec.querySelector('.done-line').textContent = i < n ? stepLine(i) : '');
  });
  if (n === 5) renderReview();
  renderSummary();
  if (scroll) $('step' + n).scrollIntoView({ behavior: 'smooth', block: 'start' });
}
// Edit links on folded steps
document.querySelectorAll('.step .edit').forEach(btn => btn.addEventListener('click', () => {
  const n = Number(btn.closest('.step').dataset.step);
  if (n === 3) return openPlan();
  goTo(n);
}));
// After an edit, go back to where the guest was
const resume = () => goTo(!booking.table ? 3 : dietDone ? 5 : 4);

function renderSummary() {
  const items = [booking.location, 'Party of ' + booking.party];
  if (booking.date) items.push(prettyDate(booking.date));
  if (booking.time) items.push(booking.time);
  if (booking.table) items.push(booking.table);
  if (booking.dietary.length || booking.notes) items.push(stepLine(4));
  $('summary').innerHTML = items.map(i => '<li>' + esc(i) + '</li>').join('');
  document.querySelectorAll('.loc-name').forEach(e => e.textContent = booking.location);
  $('grat-note').textContent = gratuityNote(booking.party);
}

// ---------- F03 step 1 ----------
$('loc').value = booking.location;
$('date').min = todayISO(); // past dates can't be picked
booking.date = (!isClosed(todayISO()) && openTimes(todayISO()).length) ? todayISO() : nextOpenDay(todayISO());
$('date').value = booking.date;

function fillTimes() {
  const keep = $('time').value;
  $('time').innerHTML = '<option value="">Choose a time</option>';
  TIMES.forEach(t => {
    const o = new Option(t, t);
    o.disabled = isPast(booking.date, t);   // passed times can't be picked
    $('time').add(o);
  });
  $('time').value = (keep && !isPast(booking.date, keep)) ? keep : '';
}

// Explains why Find a table can't run yet, or returns '' when it can
function step1Problem() {
  if (!booking.date) return 'Choose a date.';
  if (booking.date < todayISO()) return 'That date has passed. Choose today or later.';
  if (isClosed(booking.date)) return "We're closed on Mondays. Choose Tuesday to Sunday.";
  if (!openTimes(booking.date).length) return "Today's brunch times have all passed. Choose another date.";
  if (!$('time').value) return 'Choose a time to search.';
  return '';
}
function updateFind() {
  const problem = step1Problem();
  $('find').disabled = !!problem;
  $('find-status').textContent = problem;
}
// Changing step 1 after a search clears the old results
function step1Changed() {
  booking.time = '';
  booking.table = '';
  if (current > 1) goTo(1, false);
  fillTimes();
  updateFind();
  renderSummary();
}
$('loc').addEventListener('change', e => { booking.location = e.target.value; setLocation(booking.location); step1Changed(); });
$('date').addEventListener('change', e => { booking.date = e.target.value; step1Changed(); });
$('date').addEventListener('input', e => { booking.date = e.target.value; updateFind(); });
$('time').addEventListener('change', () => { booking.time = ''; booking.table = ''; updateFind(); });
$('party-minus').addEventListener('click', () => setParty(booking.party - 1));
$('party-plus').addEventListener('click', () => setParty(booking.party + 1));
function setParty(n) {
  booking.party = Math.min(POLICY.maxOnline, Math.max(1, n));
  $('party').textContent = booking.party;
  $('party-minus').disabled = booking.party === 1;
  $('party-plus').disabled = booking.party === POLICY.maxOnline;
  // a table that no longer fits the party is cleared
  const t = TABLES.find(t => describe(t) === booking.table);
  if (t && !fits(t)) booking.table = '';
  renderSummary();
}
$('find').addEventListener('click', () => { if (!step1Problem()) search(); });

// ---------- F04 / F05 / F06 step 2 ----------
function search() {
  booking.time = '';
  booking.table = '';
  goTo(2);
  ['times-ok', 'times-full', 'times-none'].forEach(id => $(id).hidden = true);
  $('loading').hidden = false;
  setTimeout(showResults, 500); // pretend to check
}

function showResults() {
  $('loading').hidden = true;
  const wanted = $('time').value;

  // F06: nothing free that day
  if (isFullyBooked(booking.date)) {
    const next = nextOpenDay(booking.date);
    const other = booking.location === 'Oshawa' ? 'Toronto' : 'Oshawa';
    $('none-msg').textContent = `We're fully booked at ${booking.location} on ${prettyDate(booking.date)}.`;
    $('try-next').textContent = 'Try ' + prettyDate(next);
    $('try-next').onclick = () => { booking.date = $('date').value = next; fillTimes(); if (!$('time').value) { goTo(1); updateFind(); } else search(); };
    $('try-other-loc').textContent = `Check ${other} instead`;
    $('try-other-loc').onclick = () => { booking.location = $('loc').value = other; setLocation(other); goTo(1); updateFind(); };
    $('times-none').hidden = false;
    return;
  }

  const taken = takenTimes(booking.date, booking.location);
  const free = (t) => !taken.includes(t) && !isPast(booking.date, t);

  // F05: the chosen time is full. Offer nearest earlier and later,
  // or the two nearest on the other side if one side has none (R-16).
  if (!free(wanted)) {
    const i = TIMES.indexOf(wanted);
    const before = TIMES.slice(0, i).reverse().filter(free);
    const after = TIMES.slice(i + 1).filter(free);
    let offers = [before[0], after[0]].filter(Boolean);
    if (!before.length) offers = after.slice(0, 2);
    if (!after.length) offers = before.slice(0, 2).reverse();
    $('full-msg').textContent = offers.length
      ? `${wanted} is fully booked. The closest times are:`
      : `${wanted} is fully booked and there are no other times that day.`;
    $('near-chips').innerHTML = '';
    offers.forEach(t => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = t;
      b.onclick = () => { $('time').value = t; pickTime(t); showChips(free); };
      $('near-chips').append(b);
    });
    $('times-full').hidden = false;
    return;
  }

  // F04: times shown, the wanted one selected
  pickTime(wanted);
  showChips(free);
}

function showChips(free) {
  $('times-full').hidden = true;
  $('chips').innerHTML = '';
  TIMES.forEach(t => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (t === booking.time ? ' selected' : '');
    b.textContent = t;
    b.disabled = !free(t);
    b.setAttribute('aria-pressed', t === booking.time);
    b.onclick = () => { $('time').value = t; pickTime(t); showChips(free); };
    $('chips').append(b);
  });
  $('times-ok').hidden = false;
}
function pickTime(t) {
  if (t !== booking.time) booking.table = ''; // a different time needs its table checked again
  booking.time = t;
  renderSummary();
}
$('see-other-day').addEventListener('click', () => { goTo(1); $('date').focus(); });

// ---------- F07 seating and table (pop-up) ----------
const TABLES = [
  // n, height, shape, x, y, minSeats, maxSeats, where, width (default 56)
  [1, 'Low', 'round', 40, 50, 1, 2, 'by the windows'],
  [2, 'Low', 'round', 140, 50, 1, 2, 'by the windows'],
  [3, 'Low', 'square', 240, 50, 2, 4, 'by the windows'],
  [4, 'Low', 'square', 340, 50, 2, 4, 'by the windows'],
  [5, 'High', 'round', 460, 70, 1, 2, 'at the bar'],
  [6, 'High', 'round', 460, 160, 1, 2, 'at the bar'],
  [7, 'High', 'round', 460, 250, 1, 2, 'at the bar'],
  [8, 'Low', 'square', 40, 160, 2, 4, 'in the middle'],
  [9, 'Low', 'square', 140, 160, 2, 4, 'in the middle'],
  [10, 'Low', 'square', 240, 160, 3, 6, 'in the middle', 80],
  [11, 'High', 'square', 350, 160, 2, 4, 'near the bar'],
  [12, 'Low', 'round', 100, 260, 1, 2, 'by the entrance'],
  [13, 'Low', 'square', 200, 260, 3, 6, 'near the kitchen', 80],
  [14, 'High', 'square', 320, 260, 3, 6, 'near the kitchen', 80],
  [15, 'Low', 'square', 380, 336, 5, 8, 'by the kitchen, long', 140],
];
let picked = null;
let filter = 'all';
const fits = (t) => booking.party >= t[5] && booking.party <= t[6];
const describe = (t) => `Table ${t[0]}, ${t[1] === 'High' ? 'high-top' : 'low table'} ${t[7]}, seats ${t[5]} to ${t[6]}`;
const takenTables = () => new Set([hash(booking.date + booking.time) % 15 + 1, (hash(booking.time) >> 3) % 15 + 1]);

function renderPlan() {
  const takenSet = takenTables();
  const cur = TABLES.find(t => t[0] === picked);
  if (cur && (!fits(cur) || takenSet.has(cur[0]))) picked = null;
  $('floor').querySelectorAll('.table').forEach(e => e.remove());
  TABLES.forEach(t => {
    const [n, h, shape, x, y, min, max, , w = 56] = t;
    const b = document.createElement('button');
    b.type = 'button';
    const isTaken = takenSet.has(n);
    const tooSmall = booking.party > max, tooBig = booking.party < min;
    const off = (filter !== 'all' && filter !== h) || tooSmall || tooBig;
    b.className = `table ${shape === 'round' ? 'round' : ''} ${isTaken ? 'taken' : ''} ${picked === n ? 'selected' : ''} ${off ? 'filtered' : ''}`;
    b.style.left = x + 'px'; b.style.top = y + 'px'; b.style.width = w + 'px';
    b.innerHTML = `${n} ${h}<br>${isTaken ? 'Taken' : min + '-' + max}`;
    b.disabled = isTaken || off;
    const why = isTaken ? ', taken' : tooSmall ? ', too small for your party' : tooBig ? ', too big for your party' : '';
    b.setAttribute('aria-label', describe(t) + why);
    b.title = describe(t) + why;
    b.onclick = () => { picked = n; renderPlan(); };
    $('floor').append(b);
  });
  const t = TABLES.find(t => t[0] === picked);
  $('table-desc').textContent = t ? describe(t) : `No table picked yet. Faded tables don't fit a party of ${booking.party}.`;
  $('book-table').disabled = !t;
  $('book-table').textContent = t ? `Book table ${t[0]}` : 'Book this table';
  $('no-pref').textContent = filter === 'all' ? 'No preference' : `No preference, any ${filter === 'High' ? 'high-top' : 'low table'}`;
}

function openPlan() {
  if (!booking.time) return goTo(2); // needs a time first
  $('plan-sub').textContent = `${prettyDate(booking.date)}, ${booking.time}, party of ${booking.party}, ${booking.location}`;
  renderPlan();
  $('plan').showModal();
}
function chooseTable(text) {
  booking.table = text;
  $('plan').close();
  resume();
}
$('open-plan').addEventListener('click', () => { if (booking.time) { goTo(3, false); openPlan(); } });
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
$('book-table').addEventListener('click', () => chooseTable(describe(TABLES.find(t => t[0] === picked))));
const noPrefText = () => (filter === 'all' ? 'No preference' : `No preference, any ${filter === 'High' ? 'high-top' : 'low table'}`);
$('no-pref').addEventListener('click', () => chooseTable(noPrefText()));

// ---------- F08 dietary needs ----------
$('diet-chips').addEventListener('click', e => {
  if (!e.target.classList.contains('chip')) return;
  e.target.setAttribute('aria-pressed', e.target.getAttribute('aria-pressed') !== 'true');
});
function finishDiet(skip) {
  if (skip) {
    $('diet-chips').querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', 'false'));
    $('notes').value = '';
  }
  booking.dietary = [...$('diet-chips').querySelectorAll('[aria-pressed="true"]')].map(c => c.dataset.value); // English values, whatever language is shown
  booking.notes = $('notes').value.trim();
  dietDone = true;
  goTo(5);
}
$('diet-continue').addEventListener('click', () => finishDiet(false));
$('diet-skip').addEventListener('click', () => finishDiet(true));

// ---------- F09 review and contact ----------
function renderReview() {
  const rows = [
    ['Location', `${booking.location}, ${LOCATIONS[booking.location].address}`, 1],
    ['Date', prettyDate(booking.date), 1],
    ['Party size', booking.party, 1],
    ['Time', booking.time, 2],
    ['Seating', booking.table, 3],
    ['Dietary needs', stepLine(4), 4],
  ];
  $('review').innerHTML = rows.map(([k, v, step]) =>
    `<dt>${k}</dt><dd>${esc(v)}</dd><button type="button" class="link-btn" data-edit="${step}">Edit</button>`).join('');
}
$('review').addEventListener('click', e => {
  const step = Number(e.target.dataset.edit);
  if (!step) return;
  if (step === 3) return openPlan();
  goTo(step);
});

$('contact').addEventListener('submit', e => {
  e.preventDefault();
  const nameOk = !!$('name').value.trim();
  const phoneOk = $('phone').value.replace(/\D/g, '').length === 10;
  $('name-field').classList.toggle('error', !nameOk);
  $('name-error').hidden = nameOk;
  $('phone-field').classList.toggle('error', !phoneOk);
  $('phone-error').hidden = phoneOk;
  if (!nameOk) return $('name').focus();
  if (!phoneOk) return $('phone').focus();

  saveBooking({ ...booking, name: $('name').value.trim(), phone: $('phone').value, email: $('email').value });
  location.href = 'confirmed.html';
});

// ---------- start ----------
fillTimes();
setParty(2);
updateFind();
goTo(1, false);

// ---------- Hooks for Gordon (js/gordon.js) ----------
// Gordon fills the same visible form (R-20) and checks every value with the same rules.
function highlight(el) {
  const f = el.closest('.field') || el;
  f.classList.remove('just-filled'); void f.offsetWidth; // restart the highlight
  f.classList.add('just-filled');
  setTimeout(() => f.classList.remove('just-filled'), 1600);
}
window.Booking = {
  state: booking,
  TIMES,
  todayISO, prettyDate, addDays, isClosed, isFullyBooked, isPast, openTimes, nextOpenDay,
  setLocation(loc) {
    booking.location = $('loc').value = loc; setLocation(loc);
    if (current > 1) goTo(1, false);
    highlight($('loc')); updateFind(); renderSummary();
  },
  setParty(n) {
    if (current > 1) goTo(1, false);
    setParty(n); highlight($('party')); updateFind();
  },
  setDate(iso) {
    booking.date = $('date').value = iso;
    if (current > 1) goTo(1, false);
    fillTimes(); highlight($('date')); updateFind(); renderSummary();
  },
  setTime(t) {
    if (current > 1) goTo(1, false);
    $('time').value = t; highlight($('time')); updateFind();
  },
  // What the search would find, without touching the page
  check() {
    const d = booking.date, t = $('time').value;
    if (isClosed(d)) return { status: 'closed' };
    if (isFullyBooked(d)) return { status: 'fullyBooked', next: nextOpenDay(d) };
    const taken = takenTimes(d, booking.location);
    const free = (x) => !taken.includes(x) && !isPast(d, x);
    if (free(t)) return { status: 'ok' };
    const i = TIMES.indexOf(t);
    const before = TIMES.slice(0, i).reverse().filter(free), after = TIMES.slice(i + 1).filter(free);
    let offers = [before[0], after[0]].filter(Boolean);
    if (!before.length) offers = after.slice(0, 2);
    if (!after.length) offers = before.slice(0, 2).reverse();
    return { status: 'full', offers };
  },
  // Show the time on the page (step 2), as if the guest pressed Find a table
  showTime() { search(); },
  setSeating(pref) { // 'Low' | 'High' | null
    booking.table = pref ? `No preference, any ${pref === 'High' ? 'high-top' : 'low table'}` : 'No preference';
    goTo(3, false); highlight($('step3')); resume();
  },
  setDietary(items, notes = '') {
    $('diet-chips').querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', items.includes(c.dataset.value)));
    $('notes').value = notes;
    if (current === 4 || current === 5) finishDiet(false); else { booking.dietary = items; booking.notes = notes; }
    highlight($('diet-chips'));
  },
  setContact(name, phone) {
    if (current !== 5) goTo(5);
    if (name) { $('name').value = name; highlight($('name')); }
    if (phone) { $('phone').value = phone; highlight($('phone')); }
  },
  contact: () => ({ name: $('name').value.trim(), phone: $('phone').value.trim() }),
  confirm() { $('contact').requestSubmit(); },
  ready: () => !!(booking.time && booking.table && dietDone),
};
