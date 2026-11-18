// Hours & locations page: fills in each location from LOCATIONS (js/common.js),
// marks today's row and says whether the location is open right now.
(function () {
  const OPEN = 9 * 60, CLOSE = 13 * 60 + 30; // 9:00 am to 1:30 pm, Tuesday to Sunday
  const now = new Date();
  const day = now.getDay(), mins = now.getHours() * 60 + now.getMinutes();
  let status;
  if (day !== 1 && mins >= OPEN && mins < CLOSE) status = 'Open now, until 1:30 pm.';
  else if (day !== 1 && mins < OPEN) status = 'Closed now. Opens today at 9 am.';
  else if (day === 0 || day === 1) status = 'Closed now. Opens Tuesday at 9 am.';
  else status = 'Closed now. Opens tomorrow at 9 am.';

  Object.keys(LOCATIONS).forEach(k => {
    const L = LOCATIONS[k];
    const q = (a) => document.querySelector(`[${a}="${k}"]`);
    if (!q('data-address')) return;
    q('data-address').textContent = L.address;
    const tel = q('data-phone');
    tel.textContent = L.phone;
    tel.href = 'tel:+1' + L.phone.replace(/\D/g, '');
    q('data-directions').href = directionsUrl(k);
    q('data-status').textContent = status;
  });
  document.querySelectorAll(`.hours-table tr[data-day="${day}"]`).forEach(tr => {
    tr.classList.add('today');
    tr.querySelector('th').setAttribute('aria-current', 'date');
  });

  // Opened from a link like hours.html#toronto: scroll to that location
  const hash = location.hash.slice(1);
  if (hash && document.getElementById(hash)) document.getElementById(hash).scrollIntoView();
})();
