// Gordon's speaking voice, shared by his booking panel (js/gordon.js) and the help tools (js/assist.js).
//
// English: a free, open AI voice, Kokoro-82M with the British male voice "bm_george", run on this
// computer by kokoro-js (vendor/kokoro) in a Web Worker (js/gordon-voice-worker.js). No API key and
// no account. The model (about 90 MB) downloads from Hugging Face the first time he speaks and is
// cached by the browser after that. The text he says is turned into sound in the browser and is never
// sent anywhere.
// While the model is loading, if it can't load, offline, or when the site is opened straight from the
// file (workers need a local server, like VS Code Live Server or GitHub Pages), he uses a voice built
// into the computer instead, picking a British male one when there is one.
// French: always a built-in French voice (Kokoro has no French Canadian voice).
//
// GordonVoice.speak(text, { lang, onstart }) -> Promise<boolean>: true when he finished, false when he
// was stopped or no voice could play. GordonVoice.cancel() stops him at once.
// Fires a "gordonvoice" event on window with detail.state: loading | ready | failed.
const GordonVoice = (() => {
  const VOICE = 'bm_george';  // British male. Others to try: bm_fable, bm_lewis, bm_daniel
  const SPEED = 1.08;         // a touch brisk, for a bit of attitude
  const AC = window.AudioContext || window.webkitAudioContext;
  const synth = window.speechSynthesis;
  const canAI = /^https?:$/.test(location.protocol) && typeof Worker !== 'undefined' && !!AC;

  let worker = null, state = canAI ? 'off' : 'failed'; // off | loading | ready | failed
  let ctx = null, run = 0, nextId = 1, source = null, utter = null, busy = false;
  const waiting = new Map(); // job id -> resolve(audio | null)

  function emit(s, extra) { state = s; window.dispatchEvent(new CustomEvent('gordonvoice', { detail: { state: s, ...extra } })); }
  function failAll() { waiting.forEach(r => r(null)); waiting.clear(); }

  // Starts loading the AI voice (first speech only; nothing downloads on page load).
  function warm() {
    if (state !== 'off') return;
    try { worker = new Worker('js/gordon-voice-worker.js', { type: 'module' }); }
    catch (e) { emit('failed'); return; }
    emit('loading');
    worker.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'ready') emit('ready');
      else if (m.type === 'progress') window.dispatchEvent(new CustomEvent('gordonvoice', { detail: { state: 'loading', pct: m.pct } }));
      else if (m.type === 'failed') { console.warn('Gordon AI voice unavailable:', m.message); emit('failed'); failAll(); }
      else if (waiting.has(m.id)) { const r = waiting.get(m.id); waiting.delete(m.id); r(m.type === 'audio' ? m : null); }
    };
    worker.onerror = (e) => { console.warn('Gordon AI voice worker error', e.message); emit('failed'); failAll(); };
  }

  // ---------- built-in voice ----------
  function builtInVoice(lang) {
    if (!synth) return null;
    const fr = lang === 'fr';
    const voices = synth.getVoices().filter(v => v.localService && (fr ? /^fr/i : /^en/i).test(v.lang));
    const male = fr ? /thomas|nicolas|daniel|paul|henri|male/i : /male|daniel|george|arthur|oliver|ryan|guy|david|mark/i;
    return (fr
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
      u.onstart = () => onstart && onstart();
      u.onend = u.onerror = (e) => { const mine = utter === u; if (mine) utter = null; resolve(mine && my === run && e.type === 'end'); };
      synth.speak(u);
    });
  }

  // ---------- AI voice ----------
  // Split into sentences so he starts talking after the first one is ready, not the whole paragraph.
  const sentences = (text) => (text.match(/[^.!?]+[.!?]+["”»)]*\s*|[^.!?]+$/g) || [text]).map(s => s.trim()).filter(Boolean);
  function generate(text) {
    const id = nextId++;
    return { id, done: new Promise(resolve => { waiting.set(id, resolve); worker.postMessage({ type: 'say', id, text, voice: VOICE, speed: SPEED }); }) };
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
    const parts = sentences(text);
    const jobs = parts.map(generate); // queued in order; the worker makes them one at a time
    let started = false;
    for (let i = 0; i < jobs.length; i++) {
      const a = await jobs[i].done;
      if (my !== run) return false;
      if (!a) return builtIn(parts.slice(i).join(' '), 'en', started ? null : onstart, my); // AI hiccup: finish with the built-in voice
      if (!started) { started = true; onstart && onstart(); }
      if (!(await play(a, my))) return false;
    }
    return true;
  }

  function speak(text, { lang = 'en', onstart } = {}) {
    cancel();
    const my = run;
    busy = true;
    // the AudioContext has to be made during the click that asked him to speak
    if (canAI && lang === 'en') { if (!ctx) { try { ctx = new AC(); } catch (e) {} } warm(); }
    const useAI = state === 'ready' && ctx && lang === 'en';
    const p = useAI ? ai(text, onstart, my) : builtIn(text, lang, onstart, my);
    return p.then(ok => { if (my === run) busy = false; return ok; });
  }
  function cancel() {
    run++;
    busy = false;
    if (worker && nextId > 1) worker.postMessage({ type: 'cancel', id: nextId - 1 });
    if (source) { try { source.stop(); } catch (e) {} source = null; }
    utter = null;
    if (synth) synth.cancel();
  }

  return {
    speak, cancel, warm,
    speaking: () => busy,
    state: () => state,
    // can he make any sound at all in this language?
    available: (lang = 'en') => (lang === 'en' && state !== 'failed') || !!builtInVoice(lang),
  };
})();
window.GordonVoice = GordonVoice;
