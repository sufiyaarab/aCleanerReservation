// Usability heuristics for Gordon, the virtual assistant (booking page).
// The plain site already follows them (clear steps, field errors, Edit links); this file makes the
// same things obvious inside Gordon's panel, where a guest can't see a form step by step.
//
// - Visibility of system status (Nielsen 1): an always-on status line under his picture says whose
//   turn it is: ready for you, listening, thinking, talking, or loading his voice. It builds on the
//   voice badge (#voice-turn in js/gordon-voice.js) and fills in the "ready" and "loading" states.
//   His 3D picture shows "Loading Gordon…" until it appears.
// - Recognition rather than recall (Nielsen 6): a "Your booking so far" strip shows every detail he
//   has, and what's still missing, so the guest never has to remember what they already said.
// - User control and freedom (Nielsen 3): each form field he fills keeps a small "Filled by Gordon"
//   tag until the guest edits it, so they can see and change anything he did.
// - Gestalt: proximity (status, progress and picture sit together as one "Gordon" card; the reply
//   chips sit right on top of the text box they answer), similarity (all of Gordon's lines look alike,
//   all of the guest's lines look alike), common region (the help tools sit in their own labelled box).
(function () {
  const panel = document.getElementById('gordon-panel');
  if (!panel || !window.Booking) return;
  const B = window.Booking;
  const fr = () => (typeof I18N !== 'undefined' && I18N.lang === 'fr');
  const T = () => fr() ? {
    ready: 'À vous : écrivez un message ou appuyez sur Parler.',
    loadingVoice: (p) => `Chargement de la voix de Gordon${p ? ` (${p} %)` : ''}… Il répond en texte en attendant.`,
    loading3d: 'Chargement de Gordon…',
    progress: 'Votre réservation jusqu’ici',
    keys: { loc: 'Adresse', party: 'Personnes', date: 'Jour', time: 'Heure', table: 'Place', diet: 'Alimentation', contact: 'Nom et tél.' },
    missing: 'à venir', none: 'Aucune', tag: 'Rempli par Gordon', tagLabel: 'Rempli par Gordon. Vous pouvez le modifier.',
  } : {
    ready: 'Your turn: type a message or press Talk.',
    loadingVoice: (p) => `Loading Gordon's voice${p ? ` (${p}%)` : ''}… He answers in text meanwhile.`,
    loading3d: 'Loading Gordon…',
    progress: 'Your booking so far',
    keys: { loc: 'Place', party: 'People', date: 'Day', time: 'Time', table: 'Seat', diet: 'Diet', contact: 'Name & phone' },
    missing: 'to come', none: 'None', tag: 'Filled by Gordon', tagLabel: 'Filled by Gordon. You can change it.',
  };
  const $ = (id) => document.getElementById(id);
  const view = panel.querySelector('.gordon-view');

  // ---------- 1. status line, always showing ----------
  let voiceLoading = null; // percent while his AI voice downloads, else null
  function statusEl() {
    let b = $('voice-turn');
    if (!b) { // same element js/gordon-voice.js uses, created early so the panel never lacks a status
      b = document.createElement('p');
      b.id = 'voice-turn';
      b.className = 'voice-turn';
      b.setAttribute('role', 'status');
      b.setAttribute('aria-live', 'polite');
      view.after(b);
    }
    return b;
  }
  let filling = false;
  function fillIdle() {
    const b = statusEl();
    const active = /\bis-(listening|talking|thinking)\b/.test(b.className);
    if (active) return;
    const want = voiceLoading !== null ? T().loadingVoice(voiceLoading) : T().ready;
    const cls = 'voice-turn ' + (voiceLoading !== null ? 'is-loading' : 'is-ready');
    if (b.textContent === want && b.className === cls && !b.hidden) return; // nothing to change
    filling = true;
    b.className = cls; b.textContent = want; b.hidden = false;
    filling = false;
  }
  // gordon-voice.js hides the line when nobody is busy; show "ready" (or "loading") instead
  new MutationObserver(() => { if (!filling) fillIdle(); })
    .observe(statusEl(), { attributes: true, childList: true, characterData: true, subtree: true });
  window.addEventListener('gordonvoice', (e) => {
    const d = e.detail || {};
    voiceLoading = d.state === 'loading' ? Math.round(d.pct || 0) || 0 : null;
    fillIdle();
  });
  window.addEventListener('langchange', () => { fillIdle(); renderProgress(); retag(); });

  // ---------- 2. "Loading Gordon…" over his picture until the 3D view appears ----------
  function showLoading3d() {
    if (location.protocol === 'file:' || view.querySelector('canvas') || view.querySelector('.gordon-loading')) return;
    const p = document.createElement('p');
    p.className = 'gordon-loading';
    p.textContent = T().loading3d;
    view.append(p);
    setTimeout(() => p.remove(), 8000); // if 3D never comes, his still picture stays and the label goes
  }
  new MutationObserver(() => { if (!panel.hidden) showLoading3d(); }).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  if (!panel.hidden) showLoading3d();

  // ---------- 3. "Your booking so far" ----------
  const prog = document.createElement('div');
  prog.className = 'gordon-progress';
  prog.innerHTML = '<p class="gordon-progress-title" id="gordon-progress-title"></p><ul id="gordon-progress-list" aria-labelledby="gordon-progress-title"></ul>';
  statusEl().after(prog);
  const short = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString(fr() ? 'fr-CA' : 'en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
  function renderProgress() {
    const s = B.state, u = T();
    const time = s.time || ''; // only once the time is checked and free, not just picked
    const name = $('name') ? $('name').value.trim() : '', phone = $('phone') ? $('phone').value.trim() : '';
    const seat = s.table ? (/no preference/i.test(s.table) ? (fr() ? 'Aucune préf.' : 'No preference') : (/high/i.test(s.table) ? (fr() ? 'Table haute' : 'High-top') : (fr() ? 'Table basse' : 'Low table'))) : '';
    const dietDone = B.ready && B.ready();
    const diet = dietDone ? ([...(s.dietary || []), s.notes].filter(Boolean).length ? String([...(s.dietary || []), s.notes].filter(Boolean).length) + (fr() ? ' noté(s)' : ' noted') : u.none) : '';
    const rows = [
      ['loc', s.location], ['party', s.party ? String(s.party) : ''], ['date', s.date ? short(s.date) : ''],
      ['time', time ? (typeof GordonLang !== 'undefined' ? GordonLang.time(time) : time) : ''], ['table', seat], ['diet', diet],
      ['contact', name && phone.replace(/\D/g, '').length === 10 ? name.split(/\s+/)[0] : ''],
    ];
    $('gordon-progress-title').textContent = u.progress;
    $('gordon-progress-list').innerHTML = rows.map(([k, v]) =>
      `<li class="${v ? 'done' : 'todo'}"><span class="k">${u.keys[k]}</span> <span class="v">${v ? esc(v) : `<span class="sr-only">${u.missing}</span>–`}</span></li>`).join('');
  }
  let raf = 0;
  const later = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(renderProgress); };
  new MutationObserver(later).observe($('gordon-log'), { childList: true });
  document.addEventListener('input', later, true);
  document.addEventListener('change', later, true);
  document.addEventListener('click', later, true);
  renderProgress();

  // ---------- 4. "Filled by Gordon" tags on the form ----------
  // only fields Gordon changed: between a guest message and his reply (the plain form also flashes fields)
  let working = false, workTimer = 0;
  new MutationObserver(list => list.forEach(m => m.addedNodes.forEach(n => {
    if (!n.classList) return;
    if (n.classList.contains('from-guest') && !n.classList.contains('hearing')) { clearTimeout(workTimer); working = true; }
    else if (n.classList.contains('from-gordon')) { clearTimeout(workTimer); workTimer = setTimeout(() => { working = false; }, 1500); }
  }))).observe($('gordon-log'), { childList: true });
  const tagged = new Set();
  function tag(field) {
    if (!working || !document.body.classList.contains('gordon-open') || field.querySelector('.gordon-tag')) return;
    const t = document.createElement('span');
    t.className = 'gordon-tag';
    t.textContent = T().tag;
    t.title = T().tagLabel;
    field.append(t);
    tagged.add(field);
    // the guest changing it themselves takes the tag away (it's theirs now)
    const untag = () => { t.remove(); tagged.delete(field); field.removeEventListener('input', untag); field.removeEventListener('change', untag); };
    field.addEventListener('input', untag);
    field.addEventListener('change', untag);
  }
  function retag() { tagged.forEach(f => { const t = f.querySelector('.gordon-tag'); if (t) { t.textContent = T().tag; t.title = T().tagLabel; } }); }
  new MutationObserver(list => list.forEach(m => {
    if (m.target.classList && m.target.classList.contains('just-filled')) tag(m.target);
  })).observe(document.querySelector('main') || document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });

  // Proximity: picture, status and booking-so-far sit together as one card, above the help tools
  view.after(statusEl(), prog);

  fillIdle();
})();
