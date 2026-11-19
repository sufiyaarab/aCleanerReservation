// Optional: lets Gordon use Claude to understand guests, for a LOCAL DEMO on your own computer.
//
// 1. Copy this file to js/config.local.js (same folder).
// 2. Paste your Anthropic API key between the quotes below, in config.local.js only.
// 3. Open booking.html and talk to Gordon. Without this file he uses the built-in parser.
//
// Never commit config.local.js (.gitignore already skips it), never upload it to Netlify or anywhere
// public, and never paste the key into any other file. Anyone who has the key can spend your credit.
// Set a low monthly spend limit in the Anthropic Console for this key.
window.GORDON_AI_CONFIG = {
  apiKey: '',               // 'sk-ant-...'
  model: 'claude-opus-5-5', // 'claude-haiku-5-5' answers faster and costs much less, if you prefer
};
