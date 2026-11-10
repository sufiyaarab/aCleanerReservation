// Gordon's accessibility tools (Tutorial 9), on every page.
// - Speak: a short welcome. Help me: what he can do on this page. Read page: reads the page aloud.
//   Guide me: the page's task in short steps with Previous, Next, Repeat and Exit. Stop: stops talking at once.
// - Everything he says is also shown as text in his panel, so sound is never needed (hearing).
// - Voice commands, only after the guest turns the mic on: "Open help", "Read page", "Guide me",
//   "Next", "Back", "Repeat", "Exit", "Stop reading" (motor).
// - Nothing plays on page load. Speech only uses voices built into the computer, like the rest of Gordon.
// - On the booking page these tools sit in Gordon's booking panel (js/gordon.js).
//   On the other pages Gordon's bubble opens a smaller help panel built here.
(function () {
  const lang = () => (typeof I18N !== 'undefined' ? I18N.lang : 'en');
  const page = document.querySelector('main.booking') ? 'booking' : document.querySelector('main.confirm') ? 'confirmed' : 'home';
  const synth = window.speechSynthesis;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- words, in English and French ----------
  const T = {
    en: {
      tools: 'Help tools', speak: 'Speak', help: 'Help me', read: 'Read page', guide: 'Guide me', stop: 'Stop',
      prev: 'Previous', next: 'Next', repeat: 'Repeat', exit: 'Exit guide', close: 'Close',
      cmdOn: 'Voice commands', cmdOff: 'Stop listening', book: 'Book a table with Gordon',
      log: 'Messages from Gordon', title: 'Gordon, your assistant',
      listening: 'Listening. Say "Open help", "Read page", "Guide me" or "Stop reading".',
      micWhy: 'I only listen for a few commands, and only after you press Voice commands. Your browser will ask to use the microphone.',
      micDenied: 'The microphone is blocked, so voice commands are off. Every button still works with the keyboard.',
      noRec: 'Voice commands need Chrome or Edge. Every button still works with the keyboard.',
      noVoice: 'This computer has no built-in voice, so I will show everything as text instead.',
      stopped: 'Stopped.',
      readStart: 'Reading the page. Press Stop at any time.',
      reading: 'Reading', readDone: 'That is the end of the page.',
      step: (i, n) => `Step ${i} of ${n}`, guideDone: 'That was the last step. Press Exit guide when you are ready.',
      welcome: "Hello! Welcome to Craves & Crumble. I'm Gordon, your accessibility assistant. I can read this page to you, guide you step by step, or book a table with you.",
      helpText: {
        home: 'To book, press Reserve a table, pick Oshawa or Toronto, then press Continue to booking. Or press Book a table with Gordon and we can do it together. Read page reads this page aloud, Guide me shows the steps one at a time, and Stop stops me talking.',
        booking: 'Tell me what you want in your own words, for example "4 people Sunday at 11", and I fill in the form for you. You can also fill it in yourself. Read page reads this page aloud, Guide me shows the steps one at a time, and Stop stops me talking. While Talk is on, you can say "Read page", "Guide me" or "Stop reading".',
        confirmed: 'Your table is booked. Read page reads your booking details aloud. To change or cancel, call the restaurant at least 4 hours ahead.',
      },
      guides: {
        home: [
          ['Press Reserve a table.', 'main [data-open-locations]'],
          ['Choose Oshawa or Toronto.', '#locations .loc-option'],
          ['Press Continue to booking.', '#loc-continue'],
        ],
        booking: [
          ['Choose how many people, the day and the time.', '#step1'],
          ['Press Find a table. If your time is taken, pick one of the nearby times shown.', '#find'],
          ['Press Choose your table. Pick a table on the plan and press Book this table, or press No preference.', '#step2'],
          ['Tap any dietary needs, then press Continue. Or press Skip this step.', '#step4'],
          ['Check your details, type your name and phone number, then press Confirm booking.', '#step5'],
        ],
        confirmed: [
          ['You are booked. Your confirmation number is at the top.', '#conf-line'],
          ['Check the place, date, time and party size.', '#details'],
          ['Press Add to calendar so you remember.', 'main.confirm .btn'],
          ['Press Get directions to find the restaurant.', '#directions'],
          ['To change or cancel, call the restaurant at least 4 hours ahead.', '#loc-phone'],
        ],
      },
    },
    fr: {
      tools: "Outils d'aide", speak: 'Parler', help: 'Aidez-moi', read: 'Lire la page', guide: 'Guidez-moi', stop: 'Arrêter',
      prev: 'Précédent', next: 'Suivant', repeat: 'Répéter', exit: 'Quitter le guide', close: 'Fermer',
      cmdOn: 'Commandes vocales', cmdOff: "Arrêter l'écoute", book: 'Réserver une table avec Gordon',
      log: 'Messages de Gordon', title: 'Gordon, votre assistant',
      listening: "J'écoute. Dites « Ouvrir l'aide », « Lire la page », « Guidez-moi » ou « Arrête de lire ».",
      micWhy: "J'écoute seulement quelques commandes, et seulement après que vous appuyez sur Commandes vocales. Votre navigateur va demander l'accès au micro.",
      micDenied: 'Le micro est bloqué, donc les commandes vocales sont désactivées. Tous les boutons fonctionnent au clavier.',
      noRec: 'Les commandes vocales demandent Chrome ou Edge. Tous les boutons fonctionnent au clavier.',
      noVoice: "Cet ordinateur n'a pas de voix intégrée, alors j'affiche tout en texte.",
      stopped: 'Arrêté.',
      readStart: 'Je lis la page. Appuyez sur Arrêter quand vous voulez.',
      reading: 'Lecture', readDone: "C'est la fin de la page.",
      step: (i, n) => `Étape ${i} sur ${n}`, guideDone: "C'était la dernière étape. Appuyez sur Quitter le guide quand vous êtes prêt.",
      welcome: "Bonjour ! Bienvenue chez Craves & Crumble. Je suis Gordon, votre assistant d'accessibilité. Je peux vous lire cette page, vous guider étape par étape ou réserver une table avec vous.",
      helpText: {
        home: 'Pour réserver, appuyez sur Réserver une table, choisissez Oshawa ou Toronto, puis appuyez sur Continuer vers la réservation. Ou appuyez sur Réserver une table avec Gordon et on le fait ensemble. Lire la page lit cette page à voix haute, Guidez-moi montre les étapes une à une, et Arrêter me fait taire.',
        booking: "Dites-moi ce que vous voulez avec vos mots, par exemple « 4 personnes dimanche à 11 h », et je remplis le formulaire pour vous. Vous pouvez aussi le remplir vous-même. Lire la page lit cette page à voix haute, Guidez-moi montre les étapes une à une, et Arrêter me fait taire. Quand Parler est actif, vous pouvez dire « Lire la page », « Guidez-moi » ou « Arrête de lire ».",
        confirmed: 'Votre table est réservée. Lire la page lit les détails à voix haute. Pour modifier ou annuler, appelez le restaurant au moins 4 heures avant.',
      },
      guides: {
        home: [
          ['Appuyez sur Réserver une table.'],
          ['Choisissez Oshawa ou Toronto.'],
          ['Appuyez sur Continuer vers la réservation.'],
        ],
        booking: [
          ['Choisissez le nombre de personnes, le jour et l’heure.'],
          ['Appuyez sur Trouver une table. Si l’heure est prise, choisissez une des heures proches.'],
          ['Appuyez sur Choisir votre table. Choisissez une table sur le plan et appuyez sur Réserver cette table, ou sur Aucune préférence.'],
          ['Touchez vos besoins alimentaires, puis appuyez sur Continuer. Ou appuyez sur Passer cette étape.'],
          ['Vérifiez les détails, tapez votre nom et votre numéro de téléphone, puis appuyez sur Confirmer la réservation.'],
        ],
        confirmed: [
          ['C’est réservé. Votre numéro de confirmation est en haut.'],
          ['Vérifiez le lieu, la date, l’heure et le nombre de personnes.'],
          ['Appuyez sur Ajouter au calendrier pour ne pas oublier.'],
          ['Appuyez sur Itinéraire pour trouver le restaurant.'],
          ['Pour modifier ou annuler, appelez le restaurant au moins 4 heures avant.'],
        ],
      },
    },
  };
  const t = () => T[lang()];
  const guideSteps = () => T.en.guides[page].map(([en, sel], i) => ({ text: lang() === 'fr' ? T.fr.guides[page][i][0] : en, sel }));

  // ---------- where the tools live ----------
  let panel = document.getElementById('gordon-panel');
  const onBooking = !!panel; // js/gordon.js already built the booking panel
  let logEl;
  if (!onBooking) {
    panel = document.createElement('section');
    panel.className = 'gordon-panel assist-panel';
    panel.id = 'gordon-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-labelledby', 'assist-title');
    panel.innerHTML = `
      <div class="gordon-top">
        <h2 id="assist-title">Gordon</h2>
        <span class="gordon-top-actions"><button type="button" class="link-btn" id="assist-close">Close</button></span>
      </div>
      <div class="gordon-view assist-view" aria-hidden="true"><img id="gordon-still" src="images/gordon-closed.png" alt=""></div>
      <div class="gordon-log" id="assist-log" role="log" aria-live="polite" aria-label="Messages from Gordon"></div>
      <p><a class="btn btn-primary" id="assist-book" href="booking.html?gordon=1">Book a table with Gordon</a></p>`;
    document.body.append(panel);
    logEl = panel.querySelector('#assist-log');
  } else {
    logEl = document.getElementById('gordon-log');
  }

  // the tools row and the guide box
  const tools = document.createElement('div');
  tools.className = 'assist-tools';
  tools.setAttribute('role', 'group');
  tools.innerHTML = `
    <button type="button" class="chip" id="assist-speak"></button>
    <button type="button" class="chip" id="assist-help"></button>
    <button type="button" class="chip" id="assist-read"></button>
    <button type="button" class="chip" id="assist-guide" aria-expanded="false" aria-controls="assist-guidebox"></button>
    <button type="button" class="chip" id="assist-stop"></button>
    <button type="button" class="chip" id="assist-cmd" aria-pressed="false"></button>`;
  const guideBox = document.createElement('div');
  guideBox.className = 'assist-guide';
  guideBox.id = 'assist-guidebox';
  guideBox.hidden = true;
  guideBox.innerHTML = `
    <p class="assist-guide-count" id="assist-count"></p>
    <p class="assist-guide-text" id="assist-step" aria-live="polite"></p>
    <div class="assist-guide-nav">
      <button type="button" class="btn" id="assist-prev"></button>
      <button type="button" class="btn btn-primary" id="assist-next"></button>
      <button type="button" class="btn" id="assist-repeat"></button>
      <button type="button" class="link-btn" id="assist-exit"></button>
    </div>`;
  const status = document.createElement('p');
  status.className = 'help assist-status';
  status.id = 'assist-status';
  status.setAttribute('aria-live', 'polite');
  const view = panel.querySelector('.gordon-view');
  view.after(tools, guideBox);
  if (onBooking) tools.after(status); else guideBox.after(status);
  const $a = (id) => document.getElementById(id);

  // ---------- captions and speech ----------
  function caption(text, cls) {
    const p = document.createElement('p');
    p.className = 'gordon-line from-gordon' + (cls ? ' ' + cls : '');
    p.lang = lang();
    p.innerHTML = `<strong>Gordon:</strong> ${esc(text)}`;
    logEl.append(p);
    logEl.scrollTop = logEl.scrollHeight;
    return p;
  }

  // Mouth: on the booking page Gordon's 3D head (or stills); elsewhere swap the two stills.
  let stillTimer = null;
  function mouth(on) {
    if (window.Gordon && window.Gordon.mouth) return window.Gordon.mouth(on ? 60000 : 0);
    const img = document.getElementById('gordon-still');
    clearInterval(stillTimer);
    if (!img) return;
    img.src = 'images/gordon-closed.png';
    if (!on || reduce) return;
    let open = false;
    stillTimer = setInterval(() => { open = !open; img.src = open ? 'images/gordon-open.png' : 'images/gordon-closed.png'; }, 160);
  }

  let current = null;      // the utterance playing now
  let warnedNoVoice = false;
  function voice() {
    if (!synth) return null;
    const pre = lang() === 'fr' ? /^fr/i : /^en/i;
    const voices = synth.getVoices().filter(v => v.localService && pre.test(v.lang));
    const male = lang() === 'fr' ? /thomas|nicolas|daniel|paul|henri|male/i : /male|daniel|george|guy|david|mark/i;
    return voices.find(v => /CA/i.test(v.lang) && male.test(v.name)) || voices.find(v => male.test(v.name)) || voices.find(v => /CA/i.test(v.lang)) || voices[0] || null;
  }
  // Says one piece of text. Resolves true when it finished, false when it was stopped or couldn't play.
  function speak(text) {
    return new Promise(resolve => {
      const v = voice();
      if (!v) {
        if (!warnedNoVoice) { warnedNoVoice = true; caption(t().noVoice); }
        return resolve(false);
      }
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.voice = v; u.lang = v.lang; u.rate = 1;
      current = u;
      u.onstart = () => mouth(true);
      // if something else cut in (Stop, or Gordon answering), this counts as stopped
      u.onend = u.onerror = (e) => { const mine = current === u; if (mine) { current = null; mouth(false); } resolve(mine && e.type === 'end'); };
      synth.speak(u);
    });
  }
  // What the buttons use: show it, then say it.
  function tell(text) { caption(text); return speak(text); }

  // ---------- Stop ----------
  let readRun = 0;           // bumps to cancel a Read page in progress
  function clearReading() { document.querySelectorAll('.assist-reading').forEach(el => el.classList.remove('assist-reading')); }
  function stop(quiet) {
    readRun++;
    current = null;
    if (synth) synth.cancel();
    mouth(false);
    clearReading();
    if (!quiet) caption(t().stopped);
  }

  // ---------- Read page ----------
  const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  function readBlocks() {
    // If a pop-up is open (location chooser, floor plan), read that; otherwise the main content.
    const root = [...document.querySelectorAll('dialog[open]')].pop() || document.querySelector('main');
    const els = [...root.querySelectorAll('h1, h2, h3, p, li, dl, label, legend, .table-desc')]
      .concat([...root.querySelectorAll('div')].filter(d => [...d.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())))
      .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
      .filter(el => visible(el) && !el.closest('#gordon-panel, nav, [aria-hidden="true"], .sr-only, button'))
      .filter((el, i, all) => !all.some(o => o !== el && o.contains(el)));     // no nested duplicates
    return els.map(el => {
      let text;
      if (el.tagName === 'DL') { // "Location: Oshawa", one row at a time
        text = [...el.querySelectorAll('dt')].map(dt => `${dt.textContent.trim()}: ${(dt.nextElementSibling && dt.nextElementSibling.textContent.trim()) || ''}`).join('. ');
      } else {
        // never read what the guest typed (name, phone, notes): only labels and text, not input values
        text = el.innerText.trim();
      }
      return { el, text: text.replace(/\s+/g, ' ') };
    }).filter(b => b.text);
  }
  async function readPage() {
    stop(true);
    const run = readRun;
    const blocks = readBlocks();
    caption(t().readStart);
    const line = caption('', 'assist-now');
    for (const b of blocks) {
      if (run !== readRun) return;
      clearReading();
      b.el.classList.add('assist-reading');
      b.el.scrollIntoView({ block: innerWidth <= 700 ? 'start' : 'nearest', behavior: reduce ? 'auto' : 'smooth' });
      line.innerHTML = `<strong>${t().reading}:</strong> ${esc(b.text)}`;
      const ok = await speak(b.text);
      if (!ok) { if (run === readRun && !voice()) { clearReading(); } return; }
    }
    if (run !== readRun) return;
    clearReading();
    line.remove();
    tell(t().readDone);
  }

  // ---------- Guide me ----------
  let gi = -1; // current step, -1 when the guide is closed
  function showStep() {
    const steps = guideSteps();
    gi = Math.max(0, Math.min(gi, steps.length - 1));
    document.querySelectorAll('.assist-target').forEach(el => el.classList.remove('assist-target'));
    const s = steps[gi];
    $a('assist-count').textContent = t().step(gi + 1, steps.length);
    $a('assist-step').textContent = s.text;
    $a('assist-step').lang = lang();
    $a('assist-prev').disabled = gi === 0;
    $a('assist-next').disabled = gi === steps.length - 1;
    const target = s.sel && [...document.querySelectorAll(s.sel)].find(visible);
    if (target) {
      target.classList.add('assist-target');
      target.scrollIntoView({ block: innerWidth <= 700 ? 'start' : 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    }
  }
  function openGuide() {
    stop(true);
    gi = 0;
    guideBox.hidden = false;
    $a('assist-guide').setAttribute('aria-expanded', 'true');
    showStep();
    $a('assist-next').focus();
  }
  function exitGuide() {
    stop(true);
    gi = -1;
    guideBox.hidden = true;
    $a('assist-guide').setAttribute('aria-expanded', 'false');
    document.querySelectorAll('.assist-target').forEach(el => el.classList.remove('assist-target'));
    $a('assist-guide').focus();
  }
  function move(d) {
    if (gi < 0) return openGuide();
    stop(true);
    const n = guideSteps().length;
    if (d > 0 && gi === n - 1) return caption(t().guideDone);
    gi += d;
    showStep();
  }
  function repeat() { if (gi >= 0) { stop(true); speak(guideSteps()[gi].text); } }

  // ---------- buttons ----------
  $a('assist-speak').onclick = () => { stop(true); tell(t().welcome); };
  $a('assist-help').onclick = () => { stop(true); tell(t().helpText[page]); };
  $a('assist-read').onclick = readPage;
  $a('assist-guide').onclick = () => (gi < 0 ? openGuide() : exitGuide());
  $a('assist-stop').onclick = () => { stop(); Cmd.stop(); };
  $a('assist-prev').onclick = () => move(-1);
  $a('assist-next').onclick = () => move(1);
  $a('assist-repeat').onclick = repeat;
  $a('assist-exit').onclick = exitGuide;
  $a('assist-cmd').onclick = () => (Cmd.on ? Cmd.stop() : Cmd.start());

  // ---------- voice commands ----------
  // Whole short phrases only, so ordinary booking talk ("4 people at 11") is never taken as a command.
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z' ]/g, ' ').replace(/\s+/g, ' ').trim();
  const COMMANDS = [
    ['stop', /^(stop|stop reading|stop talking|stop it|be quiet|arrete|arreter|arrete de lire|arrete de parler|silence|tais toi)$/],
    ['read', /^(read( the)? page|read this page|read it|lire la page|lis la page|lisez la page)$/],
    ['help', /^(open help|help|help me|show help|ouvrir l'aide|ouvre l'aide|aide|aide moi|aidez moi)$/],
    ['guide', /^(guide me|start guide|guide|guide moi|guidez moi)$/],
    ['next', /^(next|next step|suivant|etape suivante)$/],
    ['prev', /^(previous|back|go back|previous step|precedent|retour|etape precedente)$/],
    ['repeat', /^(repeat|say that again|again|repete|repeter|repetez)$/],
    ['exit', /^(exit|exit guide|close guide|quit|quitter|quitter le guide|sortir)$/],
    ['speak', /^(speak|hello|say hello|parler|bonjour)$/],
  ];
  function which(text) {
    const s = norm(text);
    const hit = COMMANDS.find(([, re]) => re.test(s));
    if (!hit) return null;
    if (['next', 'prev', 'repeat', 'exit'].includes(hit[0]) && gi < 0) return null; // only while guiding
    return hit[0];
  }
  function command(text) {
    const k = which(text);
    if (!k) return false;
    ({ stop: () => stop(), read: readPage, help: () => $a('assist-help').click(), guide: openGuide,
       next: () => move(1), prev: () => move(-1), repeat, exit: exitGuide, speak: () => $a('assist-speak').click() })[k]();
    return true;
  }

  // On the other pages the tools have their own command listener. On the booking page Gordon's Talk
  // button already listens, and gordon.js passes these phrases here, so the button is hidden there.
  const Cmd = (() => {
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    let rec = null, explained = false, local = null;
    const api = { on: false, start, stop: stopCmd };
    if (onBooking) { $a('assist-cmd').hidden = true; return api; }
    function label() {
      $a('assist-cmd').textContent = api.on ? t().cmdOff : t().cmdOn;
      $a('assist-cmd').setAttribute('aria-pressed', api.on);
      $a('assist-cmd').classList.toggle('listening', api.on);
      status.textContent = api.on ? t().listening : '';
    }
    api.label = label;
    async function start() {
      if (!Rec) return caption(t().noRec);
      if (!explained) { explained = true; caption(t().micWhy); }
      const sl = lang() === 'fr' ? 'fr-CA' : 'en-US';
      // same privacy rule as Gordon: on-device recognition when the browser has it (pack installed automatically)
      if (local === null || local.lang !== sl) {
        let ok = false;
        try {
          if (Rec.available) {
            const st = await Rec.available({ langs: [sl], processLocally: true });
            ok = st === 'available' || ((st === 'downloadable' || st === 'downloading') && await Rec.install({ langs: [sl], processLocally: true }));
          }
        } catch (e) {}
        local = { lang: sl, ok: !!ok };
      }
      rec = new Rec();
      rec.lang = sl;
      if (local.ok) rec.processLocally = true;
      rec.continuous = true;
      rec.interimResults = false;
      rec.onresult = (e) => {
        const r = e.results[e.results.length - 1];
        if (r && r.isFinal !== false) command(r[0].transcript);
      };
      rec.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture') { api.on = false; caption(t().micDenied); label(); }
      };
      rec.onend = () => { if (api.on) { try { rec.start(); } catch (e) {} } }; // keep listening until Stop listening
      api.on = true;
      label();
      try { rec.start(); } catch (e) {}
    }
    function stopCmd() { if (!api.on) return; api.on = false; if (rec) rec.abort(); label(); }
    return api;
  })();

  // ---------- labels in the current language ----------
  function labels() {
    const u = t();
    tools.setAttribute('aria-label', u.tools);
    tools.lang = lang();
    [['speak', 'speak'], ['help', 'help'], ['read', 'read'], ['guide', 'guide'], ['stop', 'stop'],
     ['prev', 'prev'], ['next', 'next'], ['repeat', 'repeat'], ['exit', 'exit']].forEach(([id, k]) => { $a('assist-' + id).textContent = u[k]; });
    if (Cmd.label) Cmd.label();
    if (!onBooking) {
      panel.lang = lang();
      $a('assist-close').textContent = u.close;
      $a('assist-book').textContent = u.book;
      $a('assist-title').textContent = 'Gordon';
      logEl.setAttribute('aria-label', u.log);
    }
    if (gi >= 0) showStep();
  }
  window.addEventListener('langchange', () => { stop(true); labels(); });
  labels();

  // ---------- open and close (pages without the booking panel) ----------
  if (!onBooking) {
    const bubble = () => document.getElementById('gordon-bubble');
    function open() {
      panel.hidden = false;
      document.body.classList.add('gordon-open');
      bubble() && bubble().setAttribute('aria-expanded', 'true');
      $a('assist-speak').focus();
    }
    function close() {
      stop(true); Cmd.stop();
      if (gi >= 0) exitGuide();
      panel.hidden = true;
      document.body.classList.remove('gordon-open');
      bubble() && bubble().setAttribute('aria-expanded', 'false');
      bubble() && bubble().focus();
    }
    window.Gordon = { open, close, toggle: () => (panel.hidden ? open() : close()) };
    $a('assist-close').onclick = close;
    panel.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    const b = bubble();
    if (b) { b.setAttribute('aria-label', 'Open Gordon, your assistant'); b.querySelector('span').textContent = 'Ask Gordon for help'; }
  }

  window.Assist = { command, isCommand: (x) => !!which(x), stop, reading: () => !!current };
})();
