// waitlist.html: R-5 wait information first, one Join button, then R-4 name, party size and phone.
// Simulated like the rest of the site; the guest's details stay on this page and are never stored.
(function () {
  const $ = (id) => document.getElementById(id);
  const L = () => Waitlist.lang();
  const T = {
    en: {
      title: 'Join today’s waitlist',
      intro: 'For guests arriving soon. Want a set time? Reserve a table instead, it’s the surest way to get a seat.',
      demo: 'Demo mode: the clock is set to opening hours so the waitlist can be shown at any time.',
      legend: 'Location',
      now: (loc) => `Right now at ${loc}`,
      waiting: (n, m) => n === 0 ? 'No wait. Come on in.' : `${n} ${n === 1 ? 'party' : 'parties'} waiting · about ${m} min`,
      closed: {
        monday: 'No estimate today: we’re closed on Mondays. The waitlist opens Tuesday at 9 am.',
        early: 'No estimate yet: the waitlist opens at 8:30 am, half an hour before we open.',
        soon: 'No estimate yet: we open at 9 am. You can join now and we’ll seat you in order.',
        late: 'No estimate: brunch is over for today. The waitlist opens again tomorrow at 9 am.',
        lateSat: 'No estimate: brunch is over for today. We’re closed Monday, so the waitlist opens again Tuesday at 9 am.',
      },
      updated: (time) => `Updates by itself · last updated ${time}`,
      join: 'Join the waitlist',
      joinClosed: 'Waitlist closed right now',
      why: 'You’ll give your name, party size and mobile number next.',
      formTitle: 'Your details',
      name: 'Name', party: 'Party size', phone: 'Mobile number',
      nameErr: 'Please enter the name we should call out.',
      phoneErr: 'Please enter a 10-digit mobile number, like 905-555-0100.',
      bigGroup: `Groups of 9 or more: please email ${POLICY.groupsEmail}.`,
      submit: 'Add me to the list', cancel: 'Cancel',
      doneTitle: (n) => `You’re on the list, ${n}.`,
      place: (pos, m) => pos <= 1 ? 'You’re next. Head over now.' : `Number ${pos} in line · about ${m} min`,
      text: (loc, last4) => `We’ll text the number ending in ${last4} when your table at ${loc} is ready. Please be there within 10 minutes of the text.`,
      leave: 'Leave the waitlist',
      left: 'You’ve left the waitlist. Nothing was saved.',
      foot: (loc) => `Questions? Call ${loc} at ${LOCATIONS[loc].phone}. Walk-ins are also welcome at the bar.`,
      pageTitle: 'Waitlist · Craves & Crumble',
      people: (n) => `${n} ${n === 1 ? 'person' : 'people'}`,
    },
    fr: {
      title: 'Liste d’attente d’aujourd’hui',
      intro: 'Pour les clients qui arrivent bientôt. Vous voulez une heure précise? Réservez une table, c’est le moyen le plus sûr d’avoir une place.',
      demo: 'Mode démo : l’horloge est réglée sur les heures d’ouverture pour montrer la liste d’attente à tout moment.',
      legend: 'Adresse',
      now: (loc) => `En ce moment à ${loc}`,
      waiting: (n, m) => n === 0 ? 'Aucune attente. Entrez!' : `${n} groupe${n === 1 ? '' : 's'} en attente · environ ${m} min`,
      closed: {
        monday: 'Pas d’estimation aujourd’hui : nous sommes fermés le lundi. La liste d’attente ouvre mardi à 9 h.',
        early: 'Pas encore d’estimation : la liste d’attente ouvre à 8 h 30, une demi-heure avant l’ouverture.',
        soon: 'Pas encore d’estimation : nous ouvrons à 9 h. Inscrivez-vous maintenant, nous vous placerons dans l’ordre.',
        late: 'Pas d’estimation : le brunch est terminé pour aujourd’hui. La liste d’attente rouvre demain à 9 h.',
        lateSat: 'Pas d’estimation : le brunch est terminé pour aujourd’hui. Nous sommes fermés lundi, la liste d’attente rouvre donc mardi à 9 h.',
      },
      updated: (time) => `Mise à jour automatique · dernière mise à jour ${time}`,
      join: 'S’inscrire sur la liste',
      joinClosed: 'Liste d’attente fermée pour le moment',
      why: 'Vous donnerez ensuite votre nom, le nombre de personnes et votre cellulaire.',
      formTitle: 'Vos coordonnées',
      name: 'Nom', party: 'Nombre de personnes', phone: 'Numéro de cellulaire',
      nameErr: 'Entrez le nom que nous appellerons.',
      phoneErr: 'Entrez un numéro de cellulaire à 10 chiffres, comme 905-555-0100.',
      bigGroup: `Groupes de 9 personnes ou plus : écrivez à ${POLICY.groupsEmail}.`,
      submit: 'M’ajouter à la liste', cancel: 'Annuler',
      doneTitle: (n) => `Vous êtes sur la liste, ${n}.`,
      place: (pos, m) => pos <= 1 ? 'C’est votre tour bientôt. Venez maintenant.' : `Numéro ${pos} dans la file · environ ${m} min`,
      text: (loc, last4) => `Nous enverrons un texto au numéro se terminant par ${last4} quand votre table à ${loc} sera prête. Présentez-vous dans les 10 minutes suivant le texto.`,
      leave: 'Quitter la liste d’attente',
      left: 'Vous avez quitté la liste d’attente. Rien n’a été enregistré.',
      foot: (loc) => `Des questions? Appelez ${loc} au ${LOCATIONS[loc].phone}. Les clients sans réservation sont aussi les bienvenus au bar.`,
      pageTitle: 'Liste d’attente · Craves & Crumble',
      people: (n) => `${n} personne${n === 1 ? '' : 's'}`,
    },
  };
  const t = () => T[L()];
  const clock = (d) => (L() === 'fr'
    ? `${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`
    : d.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' }).replace(/\./g, ''));

  // location: from the link (booking page), else the one chosen earlier this visit (R-3), else Oshawa
  const urlLoc = new URLSearchParams(location.search).get('loc');
  let loc = LOCATIONS[urlLoc] ? urlLoc : (getLocation() || 'Oshawa');
  document.querySelector(`input[name="wl-loc"][value="${loc}"]`).checked = true;
  document.querySelectorAll('input[name="wl-loc"]').forEach(r => r.addEventListener('change', () => { loc = r.value; setLocation(loc); tick(); }));

  let entry = null; // { name, last4, party, ahead, joinedAt } in memory only

  // R-5: the wait, before any details, refreshed every 20 seconds
  function tick() {
    const at = Waitlist.now(), w = Waitlist.info(loc, at), u = t();
    $('wl-now').textContent = u.now(loc);
    $('wl-big').textContent = w.open ? u.waiting(w.parties, w.minutes) : u.closed[w.reason === 'late' && at.getDay() === 0 ? 'lateSat' : w.reason];
    $('wl-card').classList.toggle('is-closed', !w.open);
    $('wl-updated').textContent = u.updated(clock(new Date()));
    const canJoin = w.open || w.reason === 'soon';
    $('wl-join').disabled = !canJoin;
    $('wl-join').textContent = canJoin ? u.join : u.joinClosed;
    $('wl-why').textContent = canJoin ? u.why : '';
    $('wl-foot').textContent = u.foot(loc);
    if (entry) { // the guest's place moves up over time
      const gone = Math.floor((Date.now() - entry.joinedAt) / 1000 / 40); // one party seated about every 40 s in the demo
      const pos = Math.max(1, entry.ahead + 1 - gone);
      const mins = Math.max(0, Math.round((pos - 1) * entry.per / 5) * 5);
      $('wl-place').textContent = u.place(pos, mins);
      $('wl-done-updated').textContent = u.updated(clock(new Date()));
    }
  }

  function labels() {
    const u = t();
    document.title = u.pageTitle;
    $('wl-title').textContent = u.title;
    $('wl-intro').textContent = u.intro;
    $('wl-demo').textContent = u.demo; $('wl-demo').hidden = !Waitlist.demo;
    $('wl-loc-legend').textContent = u.legend;
    $('wl-form-title').textContent = u.formTitle;
    $('wl-name-label').textContent = u.name; $('wl-party-label').textContent = u.party; $('wl-phone-label').textContent = u.phone;
    $('wl-name-error').textContent = u.nameErr; $('wl-phone-error').textContent = u.phoneErr;
    $('wl-big-group').textContent = u.bigGroup;
    $('wl-submit').textContent = u.submit; $('wl-cancel').textContent = u.cancel;
    $('wl-leave').textContent = u.leave;
    const sel = $('wl-party'), keep = sel.value || '2';
    sel.innerHTML = Array.from({ length: POLICY.maxOnline }, (_, i) => `<option value="${i + 1}">${esc(u.people(i + 1))}</option>`).join('');
    sel.value = keep;
    document.querySelector('main').lang = L();
    if (entry) { $('wl-done-title').textContent = u.doneTitle(entry.name); $('wl-text').textContent = u.text(loc, entry.last4); }
    tick();
  }

  // one Join button, then the details
  $('wl-join').addEventListener('click', () => {
    $('wl-form').hidden = false;
    $('wl-join').hidden = true; $('wl-why').hidden = true;
    $('wl-name').focus();
  });
  $('wl-cancel').addEventListener('click', () => {
    $('wl-form').hidden = true; $('wl-join').hidden = false; $('wl-why').hidden = false; $('wl-join').focus();
  });
  $('wl-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('wl-name').value.trim(), digits = $('wl-phone').value.replace(/\D/g, '');
    const nameOk = name.length > 0, phoneOk = digits.length === 10;
    $('wl-name-field').classList.toggle('error', !nameOk); $('wl-name-error').hidden = nameOk;
    $('wl-phone-field').classList.toggle('error', !phoneOk); $('wl-phone-error').hidden = phoneOk;
    $('wl-name').setAttribute('aria-invalid', !nameOk); $('wl-phone').setAttribute('aria-invalid', !phoneOk);
    if (!nameOk) return $('wl-name').focus();
    if (!phoneOk) return $('wl-phone').focus();
    const w = Waitlist.info(loc);
    entry = { name: name.split(/\s+/)[0], last4: digits.slice(-4), party: Number($('wl-party').value), ahead: w.open ? w.parties : 0, per: w.open && w.parties ? w.minutes / w.parties : 6, joinedAt: Date.now() };
    $('wl-form').reset(); // the full name and number aren't kept anywhere
    $('wl-form').hidden = true;
    $('wl-done').hidden = false;
    document.querySelector('.wl-locs').disabled = true;
    labels();
    $('wl-done-title').setAttribute('tabindex', '-1'); $('wl-done-title').focus();
  });
  $('wl-leave').addEventListener('click', () => {
    entry = null;
    $('wl-done').hidden = true;
    $('wl-join').hidden = false; $('wl-why').hidden = false;
    document.querySelector('.wl-locs').disabled = false;
    $('wl-why').textContent = t().left;
    $('wl-join').focus();
  });

  window.addEventListener('langchange', labels);
  labels();
  setInterval(tick, 20000); // live, no reload (R-5)
})();
