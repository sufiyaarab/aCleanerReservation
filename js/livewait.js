// R-9: live wait on the confirmation page. From 15 minutes before the booking it shows whether the
// table is on time or the expected wait in minutes, and updates by itself every 20 seconds.
// Simulated like the rest of the site. Add ?demo=1 to the URL to see it at any time (for presenting).
(function () {
  const box = document.getElementById('live-wait');
  if (!box) return;
  const $ = (id) => document.getElementById(id);
  const L = () => Waitlist.lang();
  const T = {
    en: {
      title: 'Live wait',
      before: (start, date) => `Live updates start at ${start} on ${date}, 15 minutes before your booking. This page will update by itself.`,
      onTime: 'Your table is on time.',
      late: (m) => `Running a little behind: expect about ${m} minutes after your booking time.`,
      past: 'Your booking time has passed. If you’re running late, please call the restaurant.',
      updated: (t) => `Updated ${t}`,
      demo: 'Demo mode: the clock is set to 10 minutes before your booking.',
      preview: 'Presenting? Preview the live wait',
    },
    fr: {
      title: 'Attente en direct',
      before: (start, date) => `Les mises à jour commencent à ${start} le ${date}, 15 minutes avant votre réservation. Cette page se mettra à jour toute seule.`,
      onTime: 'Votre table sera prête à l’heure.',
      late: (m) => `Un peu de retard : comptez environ ${m} minutes après l’heure de votre réservation.`,
      past: 'L’heure de votre réservation est passée. Si vous êtes en retard, appelez le restaurant.',
      updated: (t) => `Mis à jour à ${t}`,
      demo: 'Mode démo : l’horloge est réglée 10 minutes avant votre réservation.',
      preview: 'Pour une présentation : voir l’attente en direct',
    },
  };
  const t = () => T[L()];
  const hash = (s) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  const fmtTime = (d) => (L() === 'fr'
    ? `${d.getHours()} h${d.getMinutes() ? ' ' + String(d.getMinutes()).padStart(2, '0') : ''}`
    : d.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' }).replace(/\./g, ''));
  const fmtDate = (d) => d.toLocaleDateString(L() === 'fr' ? 'fr-CA' : 'en-CA', { weekday: 'long', month: 'long', day: 'numeric' });

  let b = null, openedAt = Date.now();
  function at(booking) { // "11:00 am" on 2026-12-13 -> Date
    const m = /(\d{1,2}):(\d{2})\s*(am|pm)/i.exec(booking.time || '');
    if (!m || !booking.date) return null;
    let h = Number(m[1]) % 12 + (/pm/i.test(m[3]) ? 12 : 0);
    const d = new Date(booking.date + 'T12:00:00'); d.setHours(h, Number(m[2]), 0, 0);
    return d;
  }
  function render() {
    if (!b) return;
    const when = at(b);
    if (!when) { box.hidden = true; return; }
    const u = t();
    // demo: start 10 minutes before the booking and let the clock run
    const now = Waitlist.demo ? new Date(when.getTime() - 10 * 60000 + (Date.now() - openedAt)) : new Date();
    const start = new Date(when.getTime() - 15 * 60000), end = new Date(when.getTime() + POLICY.graceMinutes * 60000);
    $('lw-title').textContent = u.title;
    $('lw-demo').hidden = !Waitlist.demo; $('lw-demo').textContent = u.demo;
    $('lw-preview').hidden = Waitlist.demo; $('lw-preview').textContent = u.preview;
    let state = 'before', text = u.before(fmtTime(start), fmtDate(start));
    if (now >= start && now <= end) {
      // mostly on time; some bookings run late, and the estimate drifts a little as minutes pass
      const seed = hash(b.location + b.date + b.time);
      const behind = seed % 10 < 3 ? 5 + (seed % 3) * 5 + (Math.floor(now.getMinutes() / 4) % 2) * 5 : 0;
      state = behind ? 'late' : 'ontime';
      text = behind ? u.late(behind) : u.onTime;
    } else if (now > end) { state = 'past'; text = u.past; }
    box.className = 'live-wait is-' + state;
    if ($('lw-text').textContent !== text) $('lw-text').textContent = text; // announced only when it changes
    $('lw-updated').textContent = state === 'before' ? '' : u.updated(fmtTime(now));
    box.lang = L();
  }
  (async () => {
    b = await loadBooking();
    if (!b || !LOCATIONS[b.location]) b = { location: 'Oshawa', date: Waitlist.iso(new Date(Date.now() + 86400000)), time: '11:00 am' }; // page opened directly
    render();
    setInterval(render, 20000); // updates without reloading
  })();
  $('lw-preview').addEventListener('click', (e) => { e.preventDefault(); location.search = '?demo=1'; });
  window.addEventListener('langchange', render);
})();
