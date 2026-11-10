// Gordon: the booking assistant on the booking page (G01 to G10), by voice or typing.
// - Opens only when the guest clicks his bubble (R-12). Nothing plays on page load.
// - Understands typed messages with the built-in parser (js/gordon-parser.js).
// - Fills the visible form as he goes, with a brief highlight (R-20), using window.Booking from booking.js,
//   so every value passes the same rules as the plain form.
// - Every message is shown as a caption in a log that screen readers announce (R-14).
// - The guest can close him at any point; what he filled stays in the form (R-11, G10).

(function () {
  if (!window.Booking) return; // only on the booking page
  const B = window.Booking;
  const S = B.state;

  // ---------- panel ----------
  const panel = document.createElement('section');
  panel.className = 'gordon-panel';
  panel.id = 'gordon-panel';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'false'); // the form stays usable while he's open
  panel.setAttribute('aria-labelledby', 'gordon-title');
  panel.innerHTML = `
    <div class="gordon-top">
      <h2 id="gordon-title">Gordon</h2>
      <span class="gordon-top-actions">
        <button type="button" class="link-btn" id="gordon-lang" lang="fr">Français</button>
        <button type="button" class="link-btn" id="gordon-sound" aria-pressed="true" hidden>Sound on</button>
        <button type="button" class="link-btn" id="gordon-close">Close</button>
      </span>
    </div>
    <div class="gordon-view" aria-hidden="true">
      <img id="gordon-still" src="images/gordon-closed.png" alt="">
    </div>
    <div class="gordon-log" id="gordon-log" role="log" aria-live="polite" aria-label="Conversation with Gordon"></div>
    <div class="chips gordon-replies" id="gordon-replies"></div>
    <form class="gordon-input" id="gordon-form" autocomplete="off">
      <label for="gordon-text" class="sr-only">Message Gordon</label>
      <input id="gordon-text" type="text" placeholder="Type here, for example: 4 people Sunday at 11">
      <button type="button" class="btn" id="gordon-mic" aria-pressed="false">Talk</button>
      <button class="btn btn-primary" id="gordon-send">Send</button>
    </form>
    <p class="help gordon-mic-status" id="gordon-mic-status" aria-live="polite"></p>
    <p class="help gordon-note" id="gordon-note">Gordon fills in the form as you go. You can edit any field yourself.</p>`;
  document.body.append(panel);
  const $g = (id) => document.getElementById(id);

  // ---------- language (R-19) ----------
  const L = GordonLang;
  const t = () => L.t;
  function applyLang() {
    const u = t().ui;
    panel.lang = L.lang;                       // screen readers switch pronunciation
    $g('gordon-close').textContent = u.close;
    $g('gordon-send').textContent = u.send;
    $g('gordon-text').placeholder = u.placeholder;
    $g('gordon-note').textContent = u.note;
    $g('gordon-log').setAttribute('aria-label', u.log);
    document.querySelector('label[for="gordon-text"]').textContent = u.label;
    $g('gordon-lang').textContent = u.other;
    $g('gordon-lang').lang = u.otherLang;
    $g('gordon-lang').setAttribute('aria-label', L.lang === 'fr' ? 'Switch Gordon to English' : 'Passer Gordon en français');
    if (typeof Voice !== 'undefined') Voice.refreshLabels();
  }
  // Gordon's button and the nav switch are the same setting: the whole site changes language
  $g('gordon-lang').addEventListener('click', () => I18N.set(L.lang === 'fr' ? 'en' : 'fr'));
  window.addEventListener('langchange', () => {
    if (L.lang === I18N.lang) return;
    L.set(I18N.lang);
    applyLang();
    Voice.stopAll();
    if (g.started) {
      const q = question(true);
      say(`${t().switched()} ${q}`, currentReplies());
    }
  });
  L.set(typeof I18N !== 'undefined' ? I18N.lang : 'en');
  const bubble = () => document.getElementById('gordon-bubble');

  // ---------- conversation state ----------
  const g = {
    started: false,
    asking: null,          // what Gordon last asked: party, date, time, seating, diet, name, phone, confirm, change
    misses: 0,             // messages in a row he couldn't understand (error flow 2)
    known: { party: false, date: false, time: false },
    timeOk: false,         // availability checked for the current party/date/time
    seating: null,         // 'Low' | 'High' | 'none'
    dietDone: false,
    busy: false,
  };
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // ---------- captions ----------
  function addLine(who, text) { // who: 'guest' | 'gordon'
    const p = document.createElement('p');
    p.className = 'gordon-line ' + (who === 'guest' ? 'from-guest' : 'from-gordon');
    p.lang = L.lang;
    p.innerHTML = `<strong>${who === 'guest' ? t().ui.you : 'Gordon'}:</strong> ${esc(text)}`;
    $g('gordon-log').append(p);
    $g('gordon-log').scrollTop = $g('gordon-log').scrollHeight;
  }
  function say(text, replies = []) {
    addLine('gordon', text);
    if (!Voice.speaking()) Avatar.talk(Math.min(3500, 400 + text.length * 35));
    const box = $g('gordon-replies');
    box.innerHTML = '';
    replies.forEach(r => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip';
      b.textContent = typeof r === 'string' ? r : r.label;
      b.onclick = () => (typeof r === 'string' ? handle(r) : r.action());
      box.append(b);
    });
    Voice.speak(text);
    $g('gordon-log').scrollTop = $g('gordon-log').scrollHeight;
  }

  // ---------- open / close ----------
  function open() {
    panel.hidden = false;
    document.body.classList.add('gordon-open');
    bubble() && bubble().setAttribute('aria-expanded', 'true');
    Avatar.start();
    if (!g.started) {
      g.started = true;
      g.asking = 'party';
      say(t().greet(S.location),
          Voice.supported ? [{ label: t().ui.talk, action: () => Voice.choose() }, { label: t().ui.type, action: () => { $g('gordon-replies').innerHTML = ''; $g('gordon-text').focus(); } }] : []);
      if (!Voice.supported) addLine('gordon', t().noVoice);
    }
    $g('gordon-text').focus();
  }
  function close() {
    panel.hidden = true;
    document.body.classList.remove('gordon-open');
    bubble() && bubble().setAttribute('aria-expanded', 'false');
    Avatar.stop();
    Voice.stopAll();
    if (window.Assist) Assist.stop(true);
    bubble() && bubble().focus();
  }
  window.Gordon = { open, close, toggle: () => (panel.hidden ? open() : close()), mouth: (ms) => Avatar.talk(ms) };
  $g('gordon-close').addEventListener('click', close);
  panel.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  $g('gordon-form').addEventListener('submit', e => {
    e.preventDefault();
    const text = $g('gordon-text').value.trim();
    if (!text) return;
    $g('gordon-text').value = '';
    handle(text);
  });
  $g('gordon-text').addEventListener('input', () => { Avatar.nod(); Voice.stopListening(); }); // typing switches from voice to text at any time (R-13)

  // ---------- understanding a message ----------
  async function handle(text, spoken) {
    // "Read page", "Guide me", "Stop reading"... go to the help tools (js/assist.js)
    if (window.Assist && Assist.isCommand(text)) { addLine('guest', text); Assist.command(text); return Voice.afterReply(); }
    // while he reads the page aloud, the mic may hear his own voice: ignore anything that isn't a command
    if (spoken && window.Assist && Assist.reading()) return Voice.afterReply();
    if (window.Assist) Assist.stop(true);
    if (g.busy) return;
    g.busy = true;
    addLine('guest', text);
    $g('gordon-replies').innerHTML = '';
    try { await respond(text); } finally { g.busy = false; }
    Voice.afterReply();
  }

  async function respond(text) {
    // The guest may have edited the form by hand since (R-20): trust the form
    if (!$('time').value) g.known.time = false;
    if (!S.time) g.timeOk = false;
    const p = GordonParser.parse(L.lang === 'fr' ? L.toEnglish(text) : text, B.todayISO(), g.asking);
    const notes = [];      // what he did, said back in one reply
    let understood = false;
    let stop = null;       // a problem he has to ask about before moving on

    if (p.wantsForm && !p.party && !p.date && !p.time) {
      say(t().toForm);
      await sleep(1200);
      return close();
    }

    // Confirm step (R-18)
    if (g.asking === 'confirm') {
      if (p.yes) {
        g.asking = 'done';
        say(t().booking);
        await sleep(900);
        Voice.stopAll();
        return B.confirm();
      }
      if (p.no || p.wantsChange) { understood = true; g.asking = 'change'; }
    }

    // Location
    if (p.location && p.location !== S.location) {
      B.setLocation(p.location); g.timeOk = false; understood = true;
      notes.push(t().location(p.location));
    } else if (p.location) understood = true;

    // Party size (R-15, R-17)
    if (p.party !== undefined) {
      understood = true;
      if (p.party > POLICY.maxOnline) {
        stop = t().tooMany(POLICY.maxOnline, POLICY.groupsEmail);
        g.asking = 'party';
      } else if (p.party < 1) {
        stop = t().howMany; g.asking = 'party';
      } else {
        const changed = g.known.party && p.party !== S.party;
        B.setParty(p.party); g.known.party = true; g.timeOk = false;
        notes.push(t().party(p.party, changed));
        if (p.party >= 6) notes.push(t().gratuity());
      }
    }

    // Date
    if (p.date === null) { understood = true; stop = stop || t().noDate; g.asking = 'date'; }
    else if (p.date) {
      understood = true;
      if (p.date < B.todayISO()) { stop = stop || t().pastDate; g.asking = 'date'; }
      else if (B.isClosed(p.date)) { stop = stop || t().closed; g.asking = 'date'; }
      else if (!B.openTimes(p.date).length) { stop = stop || t().brunchOver(L.date(p.date)); g.asking = 'date'; }
      else {
        const changed = g.known.date && p.date !== S.date;
        B.setDate(p.date); g.known.date = true; g.timeOk = false;
        notes.push(t().date(L.date(p.date), changed));
        // a time that was fine before may have passed on the new date
        if (g.known.time && !$('time').value) { g.known.time = false; notes.push(t().timeGone); }
      }
    }

    // Time
    if (p.timeProblem) {
      understood = true;
      if (p.timeProblem === 'outside') { stop = stop || t().outside(L.time(p.timeSaid)); }
      else { stop = stop || t().half(L.times(p.timeNear)); g.replies = L.times(p.timeNear); }
      g.asking = 'time';
    } else if (p.time) {
      understood = true;
      if (S.date && B.isPast(S.date, p.time)) { stop = stop || t().timePast(L.time(p.time)); g.asking = 'time'; }
      else {
        const changed = g.known.time && p.time !== $('time').value;
        B.setTime(p.time); g.known.time = true; g.timeOk = false; g.timeOffers = null;
        notes.push(t().time(L.time(p.time), changed));
      }
    }

    // Seating (low or high, the table itself stays No preference)
    if (p.seating) { understood = true; g.seating = p.seating; if (g.timeOk) B.setSeating(p.seating === 'none' ? null : p.seating); notes.push(t().seat[p.seating]); }

    // Dietary needs
    if (p.dietary || (g.asking === 'diet' && (p.no || p.none))) {
      understood = true; g.dietDone = true;
      const items = p.dietary || [];
      if (g.timeOk && g.seating) B.setDietary(items, p.notes || '');
      else { g.pendingDiet = { items, notes: p.notes || '' }; }
      notes.push(items.length ? t().dietNoted(items) : t().dietNone);
    } else if (g.asking === 'diet' && !understood && text.length > 2) {
      // anything else they type here goes into "Anything else?"
      understood = true; g.dietDone = true;
      if (g.timeOk && g.seating) B.setDietary([], text); else g.pendingDiet = { items: [], notes: text };
      notes.push(t().dietNote(text));
    }

    // Name and phone
    if (p.name) { understood = true; g.name = p.name; notes.push(t().name(p.name)); }
    if (p.phone) { understood = true; g.phone = p.phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3'); notes.push(t().phone(g.phone)); }
    else if (p.phoneBad) { understood = true; stop = stop || t().phoneShort; g.asking = 'phone'; }
    if ((p.name || p.phone) && S.time && S.table && g.dietDone) B.setContact(g.name, g.phone);

    // ---------- reply ----------
    if (!understood) {
      g.misses++;
      if (g.misses >= 3) {
        g.misses = 0;
        return say(t().lost, t().lostChips);
      }
      return say(t().notCaught(question(true)), g.replies || currentReplies());
    }
    g.misses = 0;
    if (stop) { const r = g.replies || []; g.replies = null; return say([...notes, stop].join(' '), r); }

    // Availability, as soon as party, date and time are all known (R-16)
    if (g.known.party && g.known.date && g.known.time && !g.timeOk) {
      const r = B.check();
      if (r.status === 'fullyBooked') {
        g.known.date = false; g.asking = 'date';
        const next = L.date(r.next);
        return say([...notes, t().fullyBooked(S.location, L.date(S.date), next)].join(' '), [next]);
      }
      if (r.status === 'full') {
        g.known.time = false; g.asking = 'time'; g.timeOffers = r.offers;
        const msg = r.offers.length ? t().full(L.time($('time').value), L.times(r.offers)) : t().fullNone(L.time($('time').value));
        return say([...notes, msg].join(' '), L.times(r.offers));
      }
      // free: show it on the page like Find a table does
      B.showTime();
      await sleep(700);
      g.timeOk = true;
      notes.push(t().free(L.time(S.time), L.date(S.date)));
      if (g.seating) { B.setSeating(g.seating === 'none' ? null : g.seating); await sleep(300); }
      if (g.pendingDiet && g.seating) { B.setDietary(g.pendingDiet.items, g.pendingDiet.notes); g.pendingDiet = null; }
    }
    if (g.timeOk && g.seating && g.pendingDiet) { B.setDietary(g.pendingDiet.items, g.pendingDiet.notes); g.pendingDiet = null; }
    if (g.timeOk && g.seating && g.dietDone && (g.name || g.phone)) B.setContact(g.name, g.phone);

    const q = question(false);
    say([...notes, q.text].join(' '), q.replies);
  }

  // The next thing Gordon needs. With again=true, re-asks the current question.
  function question(again) {
    const ask = (asking, text, replies = []) => { g.asking = asking; return again ? text : { text, replies }; };
    const T = t();
    if (g.asking === 'change' && !again) return ask('change', T.askChange);
    if (!g.known.party) return ask('party', T.askParty);
    if (!g.known.date) return ask('date', T.askDate);
    if (!g.known.time) return g.timeOffers && g.timeOffers.length
      ? ask('time', T.askTimeOffers(L.times(g.timeOffers)), L.times(g.timeOffers))
      : ask('time', T.askTime);
    if (!g.seating) return ask('seating', T.askSeating, T.seatChips);
    if (!g.dietDone) return ask('diet', T.askDiet, T.dietChips);
    const c = B.contact();
    if (!(g.name || c.name)) return ask('name', T.askName);
    if (!(g.phone || c.phone)) return ask('phone', T.askPhone);
    // Read-back (R-18). Uses what's in the form now, so edits the guest made by hand count (R-20).
    const now = B.contact();
    const text = T.readback({ loc: S.location, date: L.date(S.date), time: L.time(S.time), party: S.party, seat: L.seat(S.table),
      diet: [...L.diet(S.dietary), S.notes].filter(Boolean).join(', '), name: now.name || g.name, phone: now.phone || g.phone });
    return ask('confirm', text, T.confirmChips);
  }
  // The quick replies that go with the current question (used when re-asking)
  function currentReplies() {
    const T = t();
    return { time: g.timeOffers ? L.times(g.timeOffers) : [], seating: T.seatChips, diet: T.dietChips, confirm: T.confirmChips }[g.asking] || [];
  }


  // ---------- Voice (Web Speech API, built into Chrome and Edge; no server) ----------
  // R-12: the mic is only requested after the guest picks Talk and reads why (G02).
  // R-13: talk and type are interchangeable at any point. R-14: what he hears is captioned live.
  const Voice = (() => {
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const synth = window.speechSynthesis;
    const supported = !!Rec;
    let rec = null, on = false, listening = false, explained = false, soundOn = true, live = null, heard = '', utter = null;
    const status = (t) => { $g('gordon-mic-status').textContent = t; };
    const micBtn = () => $g('gordon-mic');
    if (!supported) micBtn().hidden = true;

    function setListening(v) {
      listening = v;
      micBtn().textContent = v ? t().ui.stop : t().ui.talk;
      micBtn().setAttribute('aria-pressed', v);
      micBtn().classList.toggle('listening', v);
      status(v ? t().listening : '');
    }
    // G02: explain before the browser's permission pop-up
    // Privacy: use speech recognition ON THIS DEVICE when the browser can (newer Chrome and Edge),
    // downloading its English speech pack automatically if needed, so no audio leaves the computer.
    // If the browser can't, it falls back to its normal online recognition.
    const privacyBy = {}; // per language: 'local' | 'cloud'
    const lang = () => L.speechLang(); // en-US or fr-CA; on-device language packs are per language
    async function localStatus() {
      try {
        if (!Rec.available) return 'unavailable';
        return await Rec.available({ langs: [lang()], processLocally: true }); // 'available' | 'downloadable' | 'downloading' | 'unavailable'
      } catch (e) { return 'unavailable'; }
    }
    async function choose() {
      $g('gordon-replies').innerHTML = '';
      if (!explained) {
        explained = true; // R-12: short reason before the browser's mic pop-up
        addLine('gordon', t().micWhy);
      }
      if (!privacyBy[lang()]) {
        const st = await localStatus();
        let mode = 'cloud';
        if (st === 'available') mode = 'local';
        else if (st === 'downloadable' || st === 'downloading') {
          status(t().ready);
          let ok = false;
          try { ok = await Promise.race([Rec.install({ langs: [lang()], processLocally: true }), sleep(30000).then(() => false)]); } catch (e) {}
          status('');
          mode = ok ? 'local' : 'cloud';
        }
        privacyBy[lang()] = mode;
      }
      start();
    }
    function start() {
      if (!supported || listening) return;
      on = true;
      $g('gordon-sound').hidden = false;
      if (synth) synth.cancel();
      rec = new Rec();
      rec.lang = lang();
      if (privacyBy[lang()] === 'local') rec.processLocally = true; // audio stays on the device
      rec.interimResults = true;
      rec.continuous = false;
      heard = '';
      rec.onstart = () => { setListening(true); Avatar.nod(); };
      rec.onresult = (e) => {
        let interim = '', final = '';
        for (const r of e.results) (r.isFinal ? (final += r[0].transcript) : (interim += r[0].transcript));
        heard = (final || interim).trim();
        // live caption of what he is hearing (R-14)
        if (!live) { live = document.createElement('p'); live.className = 'gordon-line from-guest hearing'; $g('gordon-log').append(live); }
        live.innerHTML = `<strong>${t().ui.youSpeaking}:</strong> ${esc(heard)}`;
        $g('gordon-log').scrollTop = $g('gordon-log').scrollHeight;
        Avatar.nod();
      };
      rec.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          on = false; // G03, error flow 1
          addLine('gordon', t().denied);
          $g('gordon-text').focus();
        } else if (e.error === 'no-speech') {
          status(t().noSpeech);
        } else if (e.error === 'audio-capture') {
          on = false;
          addLine('gordon', t().noMic);
        } else if (e.error !== 'aborted') {
          status(t().glitch);
        }
      };
      rec.onend = () => {
        setListening(false);
        if (live) { live.remove(); live = null; }
        const text = heard; heard = '';
        if (text) handle(text, true); // the caption is added by handle() before Gordon replies
        else if (on) status(t().pressTalk);
      };
      try { rec.start(); } catch (e) { setListening(false); }
    }
    // typing switches to text mode: stop listening and speaking (R-13)
    function stopListening() { if (!on) return; on = false; heard = ''; if (rec) rec.abort(); if (synth) synth.cancel(); }
    function speak(text) {
      if (!on || !soundOn || !synth) return;
      synth.cancel();
      utter = new SpeechSynthesisUtterance(text);
      utter.lang = lang();
      // only voices built into the computer (localService), so his replies aren't sent to an online voice
      const pre = L.lang === 'fr' ? /^fr/i : /^en/i;
      const voices = synth.getVoices().filter(v => v.localService && pre.test(v.lang));
      const male = L.lang === 'fr' ? /thomas|nicolas|daniel|paul|henri|male/i : /male|daniel|george|guy|david|mark/i;
      const v = voices.find(v => /CA/i.test(v.lang) && male.test(v.name)) || voices.find(v => male.test(v.name)) || voices.find(v => /CA/i.test(v.lang)) || voices[0];
      if (!v) { utter = null; return; } // no built-in voice: he answers in text only
      utter.voice = v;
      utter.rate = 1.02;
      utter.onstart = () => Avatar.talk(60000);       // mouth moves for as long as he speaks
      const mine = utter; // a newer reply cancels this one; only the latest may start listening
      utter.onend = utter.onerror = () => {
        if (utter !== mine) return;
        Avatar.talk(0); utter = null;
        if (on && g.asking && g.asking !== 'done' && !panel.hidden) start();
      };
      synth.speak(utter);
    }
    return {
      supported, choose, start, stopListening, speak,
      speaking: () => !!utter,
      // keep the conversation hands-free: listen again after he replies (when sound is off, right away)
      afterReply() { if (on && !utter && !panel.hidden && g.asking !== 'done') setTimeout(start, 400); },
      refreshLabels() { setListening(listening); $g('gordon-sound').textContent = soundOn ? t().ui.soundOn : t().ui.soundOff; },
      stopAll() { on = false; heard = ''; if (rec) rec.abort(); if (synth) synth.cancel(); utter = null; setListening(false); },
      toggleSound() {
        soundOn = !soundOn;
        $g('gordon-sound').textContent = soundOn ? t().ui.soundOn : t().ui.soundOff;
        $g('gordon-sound').setAttribute('aria-pressed', soundOn);
        if (!soundOn && synth) synth.cancel();
      },
    };
  })();
  $g('gordon-mic').addEventListener('click', () => {
    if ($g('gordon-mic').getAttribute('aria-pressed') === 'true') return Voice.stopAll(); // Stop
    if (Voice.speaking()) { window.speechSynthesis.cancel(); return; }               // interrupt him; he listens next
    Voice.choose();
  });
  $g('gordon-sound').addEventListener('click', () => Voice.toggleSound());

  // ---------- Gordon's 3D head and shoulders (falls back to the two stills) ----------
  const Avatar = (() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let three = null, loading = false, running = false, talkUntil = 0, stillTimer = null;

    async function load() {
      if (loading || three) return;
      loading = true;
      try {
        if (location.protocol === 'file:') throw new Error('3D needs a local server (file:// blocks the model)');
        const THREE = await import('three');
        const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
        const view = panel.querySelector('.gordon-view');
        const w = view.clientWidth || 320, h = view.clientHeight || 220;
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        renderer.setSize(w, h);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        const scene = new THREE.Scene();
        // Head and shoulders: he faces +X, head at about y = 2.35
        const camera = new THREE.PerspectiveCamera(28, w / h, 0.1, 20);
        camera.position.set(1.75, 2.36, 0.32);
        camera.lookAt(0, 2.34, 0);
        scene.add(new THREE.HemisphereLight(0xfff6ea, 0x4a1418, 1.6));
        const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(2, 3, 1.5); scene.add(key);
        const fill = new THREE.DirectionalLight(0xffffff, 0.8); fill.position.set(1, 2, -2); scene.add(fill);
        const gltf = await new GLTFLoader().loadAsync('models/gordon.glb');
        scene.add(gltf.scene);
        const mixer = new THREE.AnimationMixer(gltf.scene);
        const clip = (n) => gltf.animations.find(a => a.name === n);
        const actions = {};
        ['talk', 'nod', 'idle'].forEach(n => { if (clip(n)) actions[n] = mixer.clipAction(clip(n)); });
        if (actions.idle && !reduce) actions.idle.play();
        view.innerHTML = '';
        view.append(renderer.domElement);
        three = { renderer, scene, camera, mixer, actions, clock: new THREE.Clock() };
        if (running) loop();
      } catch (e) {
        console.info('Gordon is using his still images:', e.message);
      }
    }
    function loop() {
      if (!three || !running) return;
      const { renderer, scene, camera, mixer, actions, clock } = three;
      const dt = clock.getDelta();
      const talking = performance.now() < talkUntil;
      if (actions.talk) {
        if (talking && !reduce && !actions.talk.isRunning()) actions.talk.reset().play();
        if (!talking && actions.talk.isRunning()) actions.talk.fadeOut(0.15);
      }
      mixer.update(dt);
      renderer.render(scene, camera);
      requestAnimationFrame(loop);
    }
    return {
      start() { running = true; load(); if (three) { three.clock.getDelta(); loop(); } },
      stop() { running = false; },
      talk(ms) {
        talkUntil = performance.now() + ms;
        if (three || reduce) return;
        // still images: swap mouth open and closed while he "speaks"
        const img = document.getElementById('gordon-still');
        if (!img) return;
        clearInterval(stillTimer);
        let open = false;
        stillTimer = setInterval(() => {
          open = !open && performance.now() < talkUntil;
          img.src = open ? 'images/gordon-open.png' : 'images/gordon-closed.png';
          if (performance.now() >= talkUntil) { clearInterval(stillTimer); img.src = 'images/gordon-closed.png'; }
        }, 160);
      },
      nod() {
        if (!three || reduce || !three.actions.nod) return;
        const a = three.actions.nod;
        if (!a.isRunning()) { a.reset(); a.setLoop(2200, 1); a.clampWhenFinished = false; a.play(); }
      },
    };
  })();

  applyLang();

  // Opened from another page's bubble (booking.html?gordon=1): the guest already clicked him
  if (new URLSearchParams(location.search).get('gordon') === '1') open();
})();
