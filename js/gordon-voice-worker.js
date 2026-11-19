// Runs Gordon's AI voice off the main page, so the page never freezes while he makes the sound.
// Model: Kokoro-82M (free, open, Apache-2.0), run on this computer by kokoro-js.
// Only the model files are downloaded; the words Gordon says never leave the browser.
// Quality: with WebGPU (most recent Chrome and Edge on a laptop or desktop) it loads the full-precision
// model (fp32, about 310 MB the first time), which sounds smoothest and runs fast on the graphics chip.
// Without WebGPU it uses the smaller q8 model (about 90 MB) on the processor.
import { KokoroTTS } from '../vendor/kokoro/kokoro.web.js';

const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
let tts = null;
let dropBefore = 0, keep = new Set(); // jobs older than the last Stop are skipped, except lines made ahead
let chain = Promise.resolve(); // one piece at a time

async function load() {
  let gpu = false;
  try { gpu = !!(navigator.gpu && await navigator.gpu.requestAdapter()); } catch (e) {}
  const progress_callback = (p) => { if (p.status === 'progress' && /onnx$/.test(p.file || '')) postMessage({ type: 'progress', pct: Math.round(p.progress || 0) }); };
  if (gpu) {
    try {
      tts = await KokoroTTS.from_pretrained(MODEL, { dtype: 'fp32', device: 'webgpu', progress_callback });
      return postMessage({ type: 'ready', quality: 'fp32 (WebGPU)' });
    } catch (e) { /* fall through to the processor */ }
  }
  tts = await KokoroTTS.from_pretrained(MODEL, { dtype: 'q8', device: 'wasm', progress_callback });
  postMessage({ type: 'ready', quality: 'q8 (WebAssembly)' });
}
const ready = load().catch((e) => postMessage({ type: 'failed', message: String(e && e.message || e) }));

// 8 ms fade at each end, so pieces don't click when they start and stop
function fade(a, rate) {
  const n = Math.min(Math.round(rate * 0.008), a.length >> 1);
  for (let i = 0; i < n; i++) { const g = i / n; a[i] *= g; a[a.length - 1 - i] *= g; }
  return a;
}

onmessage = (e) => {
  const m = e.data;
  if (m.type === 'cancel') { dropBefore = m.id; keep = new Set(m.keep || []); return; }
  if (m.type !== 'say') return;
  chain = chain.then(async () => {
    if (m.id <= dropBefore && !keep.has(m.id)) return postMessage({ type: 'skipped', id: m.id });
    try {
      await ready;
      if (!tts) throw new Error('model not loaded');
      const a = await tts.generate(m.text, { voice: m.voice, speed: m.speed });
      if (m.id <= dropBefore && !keep.has(m.id)) return postMessage({ type: 'skipped', id: m.id });
      const audio = fade(a.audio, a.sampling_rate);
      postMessage({ type: 'audio', id: m.id, audio, rate: a.sampling_rate }, [audio.buffer]);
    } catch (err) {
      postMessage({ type: 'error', id: m.id, message: String(err && err.message || err) });
    }
  });
};
