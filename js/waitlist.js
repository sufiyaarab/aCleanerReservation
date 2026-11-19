// Waitlist and live wait (Could requirements R-4, R-5, R-9). Loaded on every page by js/common.js.
// - R-4: a "Join waitlist" link beside Reserve (kept as a plain link, so Reserve stays the main path, R-2),
//   and on the booking page when today has no table at the chosen time.
// - R-5: waitlist.html shows parties waiting and the estimated wait above one Join button, before any details.
// - R-9: the confirmation page shows a live wait from 15 minutes before the booking, updating by itself.
// Like availability, the numbers are simulated in the browser (no backend). Nothing about the guest is stored.
// Demo switch for presenting outside opening hours: add ?demo=1 to the waitlist or confirmation page URL.
const Waitlist = (() => {
  const lang = () => (typeof I18N !== 'undefined' ? I18N.lang : (() => { try { return localStorage.getItem('lang') === 'fr' ? 'fr' : 'en'; } catch (e) { return 'en'; } })());
  const demo = /[?&]demo=1\b/.test(location.search);
  const OPEN = 9 * 60, CLOSE = 13 * 60 + 30; // 9 am to 1:30 pm, Tue to Sun
  const hash = (s) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // "Now" for the simulation. In demo mode, the clock is moved to 10:40 am on the next open day,
  // keeping the real minutes and seconds ticking so the numbers still change live.
  function now() {
    const d = new Date();
    if (!demo) return d;
    const x = new Date(d);
    while (x.getDay() === 1) x.setDate(x.getDate() + 1);
    x.setHours(10, 40 + (d.getMinutes() % 15), d.getSeconds());
    return x;
  }

  // Parties waiting and minutes, from location and time of day (busiest 10:30 to noon)
  function info(loc, at = now()) {
    const mins = at.getHours() * 60 + at.getMinutes();
    if (at.getDay() === 1) return { open: false, reason: 'monday' };
    if (mins < OPEN - 30) return { open: false, reason: 'early' };
    if (mins >= CLOSE) return { open: false, reason: 'late' };
    if (mins < OPEN) return { open: false, reason: 'soon' };
    const peak = Math.max(0, 1 - Math.abs(mins - 11 * 60) / 150);           // 0 at opening, 1 at 11 am
    const slot = Math.floor(mins / 5);                                        // changes every 5 minutes
    const wobble = hash(loc + iso(at) + slot) % 3;
    const parties = Math.max(0, Math.round(peak * 6 + wobble - 1));
    const minutes = parties === 0 ? 0 : Math.min(60, Math.max(5, Math.round((parties * 6 + (hash(loc + slot) % 4)) / 5) * 5));
    return { open: true, parties, minutes };
  }

  // ---------- words ----------
  const W = {
    en: {
      nav: 'Join waitlist', navLabel: 'Join the waitlist for today',
      fullToday: 'Arriving soon? Join today’s waitlist instead.',
    },
    fr: {
      nav: 'Liste d’attente', navLabel: 'S’inscrire sur la liste d’attente d’aujourd’hui',
      fullToday: 'Vous arrivez bientôt? Inscrivez-vous plutôt sur la liste d’attente.',
    },
  };
  const t = () => W[lang()];

  // ---------- R-4: link beside Reserve, on every page ----------
  function navLink() {
    const nav = document.querySelector('.nav');
    if (!nav || document.getElementById('waitlist-link')) return;
    const a = document.createElement('a');
    a.id = 'waitlist-link';
    a.className = 'waitlist-link';
    a.href = 'waitlist.html';
    a.setAttribute('data-no-translate', '');
    if (/waitlist\.html$/.test(location.pathname)) a.classList.add('current'), a.setAttribute('aria-current', 'page');
    const reserve = nav.querySelector('.btn-primary');
    nav.insertBefore(a, reserve);
    label();
  }
  function label() {
    const a = document.getElementById('waitlist-link');
    if (!a) return;
    a.textContent = t().nav; a.setAttribute('aria-label', t().navLabel); a.lang = lang();
    const b = document.getElementById('waitlist-today');
    if (b) { b.textContent = t().fullToday; b.lang = lang(); }
  }

  // ---------- R-4: on the booking page when today has no table ----------
  function bookingHook() {
    const full = document.getElementById('times-full'), none = document.getElementById('times-none');
    const date = document.getElementById('date');
    if (!full || !none || !date) return;
    const link = document.createElement('a');
    link.id = 'waitlist-today';
    link.className = 'waitlist-today';
    link.setAttribute('data-no-translate', '');
    const place = () => {
      const today = date.value === iso(new Date());
      const target = !none.hidden ? none : !full.hidden ? full : null;
      if (!today || !target) { link.remove(); return; }
      const loc = (document.getElementById('loc') || {}).value || '';
      link.href = 'waitlist.html' + (loc ? '?loc=' + encodeURIComponent(loc) : '');
      if (link.parentElement !== target) target.append(link);
      label();
    };
    new MutationObserver(place).observe(full, { attributes: true, attributeFilter: ['hidden'] });
    new MutationObserver(place).observe(none, { attributes: true, attributeFilter: ['hidden'] });
  }

  function init() {
    navLink();
    bookingHook();
    window.addEventListener('langchange', label);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  return { info, now, demo, lang, iso };
})();
