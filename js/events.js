// Private events page: the request form.
// Like the booking page, nothing is sent or stored. The form is checked, then a thank-you is shown.
// Rules: at least 48 hours ahead, not a Monday (closed), 9 to 60 guests (8 or fewer book online).
(function () {
  const $ = (id) => document.getElementById(id);
  const form = $('event-form');
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const earliest = new Date(); earliest.setDate(earliest.getDate() + 2);
  $('ev-date').min = iso(earliest);
  // start on the first open day (not a Monday) two weeks out
  const start = new Date(); start.setDate(start.getDate() + 14);
  if (start.getDay() === 1) start.setDate(start.getDate() + 1);
  $('ev-date').value = iso(start);
  const remembered = getLocation();
  if (remembered) form.querySelector(`input[name="ev-loc"][value="${remembered}"]`).checked = true;

  function show(field, msg) {
    $(field + '-field').classList.toggle('error', !!msg);
    $(field + '-error').hidden = !msg;
    if (msg) $(field + '-error').textContent = msg;
    $(field).setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  }
  function check() {
    const v = $('ev-date').value;
    const d = v ? new Date(v + 'T12:00:00') : null;
    const dateMsg = !d ? 'Choose a date.'
      : v < iso(earliest) ? 'Please choose a date at least 48 hours from now.'
      : d.getDay() === 1 ? "We're closed on Mondays. Choose Tuesday to Sunday." : '';
    const g = Number($('ev-guests').value);
    const guestMsg = !g || g < 1 ? 'Enter how many guests.'
      : g < 9 ? 'For 8 or fewer, book a table online.'
      : g > 60 ? 'For more than 60 guests, email groups@cravesandcrumble.com.' : '';
    const ok = [
      show('ev-date', dateMsg),
      show('ev-guests', guestMsg),
      show('ev-name', $('ev-name').value.trim() ? '' : 'Enter your name'),
      show('ev-email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($('ev-email').value.trim()) ? '' : 'Enter an email, like name@example.com'),
    ];
    return ok.every(Boolean);
  }
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!check()) { form.querySelector('[aria-invalid="true"]').focus(); return; }
    const loc = form.querySelector('input[name="ev-loc"]:checked').value;
    const first = $('ev-name').value.trim().split(/\s+/)[0];
    const date = new Date($('ev-date').value + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
    $('ev-done-title').textContent = `Thanks, ${first}. Your request is sent.`;
    $('ev-done-line').textContent = `Party of ${$('ev-guests').value} at ${loc} on ${date}. Our events team will email you within 1 business day. Questions? Call ${LOCATIONS[loc].phone}.`;
    form.hidden = true;
    $('ev-done').hidden = false;
    $('ev-done').focus();
  });
  $('ev-again').addEventListener('click', () => {
    form.reset();
    $('ev-date').value = iso(start);
    form.hidden = false;
    $('ev-done').hidden = true;
    $('ev-name').focus();
  });
})();
