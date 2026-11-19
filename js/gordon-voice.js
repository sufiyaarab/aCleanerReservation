// Gordon's speaking voice, shared by his booking panel (js/gordon.js) and the help tools (js/assist.js).
//
// English: a free, open AI voice, Kokoro-82M with the British male voice "bm_george", run on this
// computer (WebGPU fp32 when available, else WebAssembly q8) by kokoro-js (vendor/kokoro) in a Web
// Worker (js/gordon-voice-worker.js). No API key and no account. The model downloads from Hugging Face
// the first time (about 310 MB with WebGPU, 90 MB without) and is cached by the browser after that.
// The text he says is turned into sound in the browser and is never sent anywhere.
// It starts loading as soon as the guest opens his panel, so it's usually ready by the time he speaks.
// While it's still loading he waits for it (up to 20 seconds; his words show as text). If it can't load,
// offline, or when the site is opened straight from the file (workers need a local server, like VS Code
// Live Server or GitHub Pages), he uses a voice built into the computer, British male when there is one.
// French: always a built-in French voice (Kokoro has no French Canadian voice).
//
// Speed: the first sentence is made on its own so he starts talking quickly, and the next part is made
// while he says the current one. GordonVoice.prefetch(text) prepares a line ahead (Read page uses it).
//
// Turn-taking (so guests always know whose turn it is):
// - A badge on Gordon's picture says "Gordon is talking", "Listening, your turn" or "Thinking".
//   GordonVoice.mic(true | false | 'thinking') is how the panels report the microphone.
// - A short rising beep plays when the mic opens and a falling one when it closes.
// - A "gordontalk" event (detail.talking) fires when he starts and stops, so listeners can pause the
//   mic while he speaks and never hear his own voice.
//
// GordonVoice.speak(text, { lang, onstart }) -> Promise<boolean>: true when he finished, false when he
// was stopped or no voice could play. GordonVoice.cancel() stops him at once.
// Fires a "gordonvoice" event on window with detail.state: loading | ready | failed | fallback.
const GordonVoice = (() => {
  const VOICE = 'bm_george';  // British male. Others to try: bm_fable, bm_lewis, bm_daniel
  const SPEED = 1.0;          // his natural pace; above 1 starts to sound clipped
  const WAIT_MS = 20000;      // while the AI voice loads, wait this long for it before the built-in voice stands in
  const AC = window.AudioContext || window.webkitAudioContext;
  const synth = window.speechSynthesis;
  const canAI = /^https?:$/.test(location.protocol) && typeof Worker !== 'undefined' && !!AC;

  let worker = null, state = canAI ? 'off' : 'failed'; // off | loading | ready | failed
  let ctx = null, run = 0, nextId = 1, source = null, utter = null, busy = false, quality = '';
  let readyWaiters = [];
  const waiting = new Map(); // job id -> resolve(audio | null)
  const made = new Map();    // text piece -> { id, done } made ahead of time (prefetch)

  function emit(s, extra) { state = s; window.dispatchEvent(new CustomEvent('gordonvoice', { detail: { state: s, ...extra } })); }
  function wakeWaiters() { readyWaiters.forEach(r => r()); readyWaiters = []; }
  function failAll() { waiting.forEach(r => r(null)); waiting.clear(); made.clear(); wakeWaiters(); }

  function audioCtx() {
    if (!ctx && AC) { try { ctx = new AC(); } catch (e) {} }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  // Starts loading the AI voice. Called when the guest opens his panel or asks him to speak.
  function warm() {
    if (canAI) audioCtx(); // needs the guest's click, which is why this runs from clicks
    if (state !== 'off') return;
    try { worker = new Worker('js/gordon-voice-worker.js', { type: 'module' }); }
    catch (e) { emit('failed'); return; }
    emit('loading');
    worker.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'ready') { quality = m.quality; console.info('Gordon AI voice ready:', m.quality); emit('ready'); wakeWaiters(); }
      else if (m.type === 'progress') window.dispatchEvent(new CustomEvent('gordonvoice', { detail: { state: 'loading', pct: m.pct } }));
      else if (m.type === 'failed') { console.warn('Gordon AI voice unavailable:', m.message); emit('failed'); failAll(); }
      else if (waiting.has(m.id)) { const r = waiting.get(m.id); waiting.delete(m.id); r(m.type === 'audio' ? m : null); }
    };
    worker.onerror = (e) => { console.warn('Gordon AI voice worker error', e.message); emit('failed'); failAll(); };
  }
  // Load as soon as the guest opens Gordon (a click on his bubble or anything in his panel),
  // or right away if they arrived by clicking "Book a table with Gordon" on another page.
  document.addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('#gordon-bubble, .gordon-panel, [data-gordon]')) warm();
  }, true);
  if (/[?&]gordon=1/.test(location.search) && canAI) setTimeout(warm, 0);

  // ---------- whose turn it is ----------
  let micState = false; // false | true (listening) | 'thinking'
  function badge() {
    let b = document.getElementById('voice-turn');
    const view = document.querySelector('.gordon-panel .gordon-view');
    if (!view) return null;
    if (!b) {
      b = document.createElement('p');
      b.id = 'voice-turn';
      b.className = 'voice-turn';
      b.setAttribute('role', 'status');
      b.setAttribute('aria-live', 'polite');
      view.after(b); // just under his picture
    }
    return b;
  }
  const fr = () => (typeof I18N !== 'undefined' && I18N.lang === 'fr') || (typeof GordonLang !== 'undefined' && GordonLang.lang === 'fr');
  function showTurn() {
    const b = badge();
    if (!b) return;
    const [cls, en, frText] = busy && talking ? ['talking', 'Gordon is talking. Press Stop to cut in.', 'Gordon parle. Appuyez sur Arrêter pour l’interrompre.']
      : micState === true ? ['listening', 'Listening. Your turn, speak now.', 'J’écoute. À vous, parlez maintenant.']
      : micState === 'thinking' ? ['thinking', 'Gordon is thinking…', 'Gordon réfléchit…']
      : ['', '', ''];
    b.className = 'voice-turn' + (cls ? ' is-' + cls : '');
    b.textContent = fr() ? frText : en;
    b.hidden = !cls;
  }
  function beep(up) {
    const c = audioCtx();
    if (!c) return;
    try {
      const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
      o.type = 'sine';
      o.frequency.setValueAtTime(up ? 660 : 880, t);
      o.frequency.linearRampToValueAtTime(up ? 990 : 550, t + 0.12);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + 0.18);
    } catch (e) {}
  }
  function mic(v) {
    const was = micState === true;
    micState = v;
    if ((v === true) !== was) beep(v === true);
    showTurn();
  }
  let talking = false;
  function setTalking(v) {
    if (talking === v) return;
    talking = v;
    showTurn();
    window.dispatchEvent(new CustomEvent('gordontalk', { detail: { talking: v } }));
  }

  // ---------- built-in voice ----------
  function builtInVoice(lang) {
    if (!synth) return null;
    const isFr = lang === 'fr';
    const voices = synth.getVoices().filter(v => v.localService && (isFr ? /^fr/i : /^en/i).test(v.lang));
    const male = isFr ? /thomas|nicolas|daniel|paul|henri|male/i : /male|daniel|george|arthur|oliver|ryan|guy|david|mark/i;
    return (isFr
      ? voices.find(v => /CA/i.test(v.lang) && male.test(v.name)) || voices.find(v => male.test(v.name)) || voices.find(v => /CA/i.test(v.lang))
      : voices.find(v => /GB/i.test(v.lang) && male.test(v.name)) || voices.find(v => /GB/i.test(v.lang)) || voices.find(v => male.test(v.name))
    ) || voices[0] || null;
  }
  function builtIn(text, lang, onstart, my) {
    return new Promise(resolve => {
      const v = builtInVoice(lang);
      if (!v || my !== run) return resolve(false);
      const u = new SpeechSynthesisUtterance(text);
      u.voice = v; u.lang = v.lang; u.rate = 1.05; u.pitch = 0.95;
      utter = u;
      u.onstart = () => { setTalking(true); onstart && onstart(); };
      u.onend = u.onerror = (e) => { const mine = utter === u; if (mine) utter = null; resolve(mine && my === run && e.type === 'end'); };
      synth.speak(u);
    });
  }

  // ---------- AI voice ----------
  // The first sentence goes on its own so he starts quickly; the rest is joined into pieces of up to
  // about 250 characters, which sound more natural and leave fewer gaps.
  function pieces(text) {
    const list = (text.match(/[^.!?]+[.!?]+["”»)]*\s*|[^.!?]+$/g) || [text]).map(s => s.trim()).filter(Boolean);
    const out = list.slice(0, 1);
    for (const s of list.slice(1)) {
      if (out.length > 1 && (out[out.length - 1] + ' ' + s).length <= 250) out[out.length - 1] += ' ' + s;
      else out.push(s);
    }
    return out;
  }
  function job(text) {
    if (made.has(text)) { const j = made.get(text); made.delete(text); return j; }
    const id = nextId++;
    return { id, done: new Promise(resolve => { waiting.set(id, resolve); worker.postMessage({ type: 'say', id, text, voice: VOICE, speed: SPEED }); }) };
  }
  // Make a line ahead of time, so it plays with no wait when speak() asks for it.
  // Phone and confirmation numbers are read one digit at a time ("four one six, five five five...")
  // instead of as amounts ("four hundred and sixteen"). Only the spoken words change, not the captions.
  const DIGITS = { en: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'],
    fr: ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'] };
  function sayable(text, lang) {
    const w = DIGITS[lang === 'fr' ? 'fr' : 'en'];
    const spell = (g) => g.split('').map(d => w[d]).join(' ');
    return String(text)
      .replace(/(?:\+?1[\s.-]?)?\(?(\d{3})\)?[\s.-]?(\d{3})[\s.-](\d{4})\b/g, (m, a, b, c) => `${spell(a)}, ${spell(b)}, ${spell(c)}`)
      .replace(/#?\b\d{4,}\b/g, (m) => spell(m.replace('#', '')));
  }
  function prefetch(text, lang = 'en') {
    text = sayable(text, lang);
    if (lang !== 'en' || state !== 'ready' || !text) return;
    pieces(text).forEach(p => { if (!made.has(p)) made.set(p, job(p)); });
  }
  function play(a, my) {
    return new Promise(resolve => {
      if (my !== run) return resolve(false);
      const buf = ctx.createBuffer(1, a.audio.length, a.rate);
      buf.copyToChannel(a.audio, 0);
      const s = ctx.createBufferSource();
      s.buffer = buf; s.connect(ctx.destination);
      source = s;
      s.onended = () => { if (source === s) source = null; resolve(my === run); };
      s.start();
    });
  }
  async function ai(text, onstart, my) {
    if (ctx.state === 'suspended') { try { await ctx.resume(); } catch (e) {} }
    const parts = pieces(text);
    const jobs = parts.map(job); // queued in order; the worker makes the next while this one plays
    let started = false;
    for (let i = 0; i < jobs.length; i++) {
      const a = await jobs[i].done;
      if (my !== run) return false;
      if (!a) return builtIn(parts.slice(i).join(' '), 'en', started ? null : onstart, my); // AI hiccup: finish with the built-in voice
      if (!started) { started = true; setTalking(true); onstart && onstart(); }
      if (!(await play(a, my))) return false;
    }
    return true;
  }

  function speak(text, { lang = 'en', onstart } = {}) {
    text = sayable(text, lang);
    stopNow(true); // a new line replaces the old one but keeps lines made ahead
    const my = run;
    busy = true;
    showTurn();
    if (canAI && lang === 'en') warm();
    const p = (async () => {
      // still loading: wait for the AI voice (the text is already on screen) rather than switch voices mid-chat
      if (lang === 'en' && ctx && state === 'loading') {
        await Promise.race([new Promise(r => readyWaiters.push(r)), new Promise(r => setTimeout(r, WAIT_MS))]);
        if (my !== run) return false;
      }
      if (lang === 'en' && ctx && state === 'ready') return ai(text, onstart, my);
      if (lang === 'en' && !canAI) notice('file');
      else if (lang === 'en') notice(state === 'failed' ? 'failed' : 'slow');
      return builtIn(text, lang, onstart, my);
    })();
    return p.then(ok => { if (my === run) { busy = false; setTalking(false); showTurn(); } return ok; });
  }
  // tells the guest once why the backup (built-in) voice is speaking
  const told = {};
  function notice(why) { if (told[why]) return; told[why] = true; window.dispatchEvent(new CustomEvent('gordonvoice', { detail: { state: 'fallback', why } })); }

  function stopNow(keepMade) {
    run++;
    busy = false;
    if (worker && nextId > 1) {
      const keep = keepMade ? [...made.values()].map(j => j.id) : [];
      if (!keepMade) made.clear();
      worker.postMessage({ type: 'cancel', id: nextId - 1, keep });
    }
    if (source) { try { source.stop(); } catch (e) {} source = null; }
    utter = null;
    if (synth) synth.cancel();
    setTalking(false);
  }
  const cancel = () => stopNow(false);

  return {
    speak, cancel, warm, prefetch, mic,
    speaking: () => busy,
    state: () => state,
    quality: () => quality, // which model is playing, once ready
    // can he make any sound at all in this language?
    available: (lang = 'en') => (lang === 'en' && state !== 'failed') || !!builtInVoice(lang),
  };
})();
window.GordonVoice = GordonVoice;
