// Runs Gordon's AI voice off the main page, so the page never freezes while he "thinks" of the sound.
// Model: Kokoro-82M (free, open, Apache-2.0), run on this computer with WebAssembly by kokoro-js.
// Only the model files are downloaded; the words Gordon says never leave the browser.
import { KokoroTTS } from '../vendor/kokoro/kokoro.web.js';

const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
let tts = null;
let dropBefore = 0; // jobs older than the last Stop are skipped
let chain = Promise.resolve(); // one sentence at a time

const ready = KokoroTTS.from_pretrained(MODEL, {
  dtype: 'q8', device: 'wasm',
  progress_callback: (p) => { if (p.status === 'progress' && /onnx$/.test(p.file || '')) postMessage({ type: 'progress', pct: Math.round(p.progress || 0) }); },
}).then((m) => { tts = m; postMessage({ type: 'ready' }); })
  .catch((e) => postMessage({ type: 'failed', message: String(e && e.message || e) }));

onmessage = (e) => {
  const m = e.data;
  if (m.type === 'cancel') { dropBefore = m.id; return; }
  if (m.type !== 'say') return;
  chain = chain.then(async () => {
    if (m.id <= dropBefore) return postMessage({ type: 'skipped', id: m.id });
    try {
      await ready;
      if (!tts) throw new Error('model not loaded');
      const a = await tts.generate(m.text, { voice: m.voice, speed: m.speed });
      if (m.id <= dropBefore) return postMessage({ type: 'skipped', id: m.id });
      postMessage({ type: 'audio', id: m.id, audio: a.audio, rate: a.sampling_rate }, [a.audio.buffer]);
    } catch (err) {
      postMessage({ type: 'error', id: m.id, message: String(err && err.message || err) });
    }
  });
};
