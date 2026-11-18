# Craves & Crumble: rough base site (F01 to F10)

Open `index.html` in a browser. Plain HTML, CSS and JS, no build step, no backend.

| Frame | Where |
|---|---|
| F01 Home | index.html |
| F02 Choose location | pop-up on index.html (Reserve buttons) |
| F03 Booking page | booking.html, step 1 |
| F04 Times available | booking.html, step 2 after Find a table |
| F05 Time is full | step 2, when the time you picked in step 1 is booked (two fake booked times per day) |
| F06 No times that date | step 2, pick a fully booked date (fake: the 7th, 14th, 21st, 28th). Mondays are closed and blocked in step 1 |
| F07 Seating and table | pop-up from Choose your table |
| F08 Dietary needs | booking.html, step 4 |
| F09 Review and contact | booking.html, step 5 (try a short phone number to see the error) |
| F10 Confirmed | confirmed.html |

Availability is fake demo data in js/booking.js. The Gordon bubble (js/common.js) is only a placeholder.
Colours live as variables at the top of css/styles.css.

Booking page behaviour: finished steps fold into one line with an Edit link. Changing step 1 after a search clears the old results. Mondays, past dates and today's passed times can't be searched; the line under Find a table says why. The chosen location is remembered for the session.

When copying into your repo, copy the whole website folder (all files change together).

## Gordon (voice and typing)
Click the bubble in the bottom-right corner. Gordon understands typed messages with a built-in parser (js/gordon-parser.js, no AI, no server) and fills the form as you go (js/gordon.js). Every value goes through the same rules as the form.
Try: "4 people this Sunday at 11", "actually make it 3", "10 people", "at 3pm", "high-top", "nut allergy", a name, a phone number, then "yes".

His 3D waffle body (js/gordon-waffle.js, built from three.js shapes, no model file) only loads when the site runs from a local server, such as VS Code Live Server or GitHub Pages. Opened straight from the file, he uses his two still images instead. Everything else works either way.
Waffle Gordon: round waffle with eyes, eyebrows, a curled mustache, chef hat and legs. He blinks, follows the pointer with his eyes, moves his mouth and mustache while talking, and changes face with the chat: listening while you type, thinking after you send, sorry when something can't be booked, a hop for good news and a jump with a spin when he books. With reduced motion turned on he keeps the faces but doesn't bounce or jump. Original design (not a brand mascot). The old Priest-based model (models/gordon.glb) and its stills (images/old-priest/) are kept but no longer used.

Voice: press Talk (or the Talk choice when he greets you). He explains why he needs the microphone first, then the browser asks. What you say appears live in his captions, and he answers out loud (Sound on/off at the top). Typing at any time switches back to text. Privacy: Gordon uses speech recognition on the device when the browser supports it (newer Chrome and Edge), downloading the English speech pack automatically, so no audio leaves the computer. Otherwise he uses the browser's normal online recognition. His spoken voice is described in "Gordon's voice" below, and three.js is served from vendor/ (no CDN).

Whole site in French (R-19): every page has a Français/English button in the nav (js/i18n.js). It translates all visible text on the home page, location pop-up, booking steps, floor plan, review and confirmation, including dates ("dimanche 15 novembre") and times ("11 h 30"). The choice is remembered in localStorage and is the same setting as Gordon's Français button, so switching either one switches both. Form values are still stored in English behind the scenes.

Gordon in French: js/gordon-lang.js holds all his lines in both languages and turns French replies ("4 personnes dimanche à 11 h", "table basse", "oui") into words the parser knows. His speech and listening switch to fr-CA.

## Gordon's voice (free AI, British)

js/gordon-voice.js gives Gordon one voice for his booking panel and his help tools. In English he uses Kokoro-82M, a free, open text-to-speech model (Apache-2.0), with its British male voice `bm_george` at a slightly brisk speed. It runs on the guest's own computer in a Web Worker (js/gordon-voice-worker.js) through kokoro-js, which is self-hosted in vendor/kokoro. No API key, no account, and the words he says never leave the browser.

- The model (about 90 MB) only downloads the first time he speaks, from Hugging Face, and the ONNX Runtime files load from cdn.jsdelivr.net. The browser caches both, so later visits start fast. Gordon says when the voice is loading and when it's ready.
- Until it's ready, offline, if it fails, or when the site is opened straight from the file (workers need a local server such as VS Code Live Server or GitHub Pages), he uses a voice built into the computer, picking a British male one when there is one (for example Daniel on a Mac).
- French always uses a built-in French voice, since Kokoro has no French Canadian voice.
- To try another voice, change `VOICE` at the top of js/gordon-voice.js (bm_fable, bm_lewis, bm_daniel). `SPEED` sets how brisk he is.
- The sass is in his wording (js/gordon-lang.js and js/assist.js). The model can't act out emotions, so it reads every line in the same friendly tone.

## Gordon's help tools (Tutorial 9)

js/assist.js adds a row of help tools to Gordon on every page. On the booking page they sit inside his booking panel. On the home and confirmation pages his bubble ("Ask Gordon for help") opens a smaller help panel with a "Book a table with Gordon" button.

- Speak: a short welcome. Help me: what he can do on this page. Both are shown as text and spoken.
- Read page: reads the main content (or an open pop-up) aloud, one block at a time, highlighting the block being read and showing it as text. It skips the nav, hidden content, Gordon's panel and anything typed into fields.
- Guide me: the page's task in short steps (3 on home, 5 on booking, 5 on confirmation) with Previous, Next, Repeat (reads the step aloud) and Exit guide. The part of the page each step is about gets a dashed outline.
- Stop: stops speech and reading at once.
- Voice commands: "Open help", "Read page", "Guide me", "Next", "Back", "Repeat", "Exit", "Stop reading" (and the French versions). On home and confirmation they need the Voice commands button first. On booking, say them to Gordon while Talk is on. Only whole short phrases count, so booking talk is never taken as a command.
- Nothing plays on page load. Speech uses Gordon's voice (see "Gordon's voice"). Recognition is on-device when the browser supports it, otherwise the browser's own online service (the privacy limit the tutorial asks you to explain).
- Mouth: the 3D waffle's mouth on the booking page, the two stills elsewhere. Visible keyboard focus everywhere, Esc closes the panel and returns focus to the bubble. On phones the page can scroll above the panel so guide targets aren't hidden.

## Guest data privacy

Nothing is stored while the guest fills in the form. When they confirm, js/common.js (saveBooking) keeps only what the confirmation page shows: the first name, the last 4 digits of the phone and how many dietary needs were noted. The full name, full number, email, dietary/health needs and notes are never stored. That small record is encrypted with AES-GCM (Web Crypto API) using a fresh, non-extractable key kept in IndexedDB, and the encrypted copy sits in sessionStorage, which is wiped when the tab closes. Limit: encryption in the browser can't stop a script running on the same site, because it can use the same key. So the real protection is storing as little as possible and adding no third-party scripts. The warning comment in common.js explains this.

## Optional: Gordon with Claude (local demo only)

By default Gordon understands guests with the built-in parser (js/gordon-parser.js). For a demo on your own computer he can use Claude instead, which copes with casual wording ("me, my partner and our 2 kids this Sunday around 10ish") and answers questions about the restaurant.

Setup:
1. Copy `js/config.example.js` to `js/config.local.js`.
2. Put your Anthropic API key in `config.local.js` (and only there). Set a low monthly spend limit for that key in the Anthropic Console.
3. Open booking.html and talk to Gordon. "Gordon is thinking…" shows while he waits for Claude.

How it works (js/gordon-ai.js): each guest message goes to Claude (model `claude-opus-5-5` by default, low effort; `claude-haiku-5-5` is faster and cheaper, set it in the config) with the restaurant's facts and a strict JSON format. Claude only reads details and answers questions. Every value it returns is checked against fixed lists and formats, then Gordon runs the same rules as the plain form (party limit, Mondays, brunch hours, availability) before filling anything in. If there's no key, the call fails three times, times out (12 s) or is declined, he uses the built-in parser. The SDK is self-hosted in vendor/anthropic (bundled from @anthropic-ai/sdk 1.10.0) and is only loaded when a key is set.

Safety: `.gitignore` keeps `js/config.local.js` out of GitHub. Never commit it, upload it to Netlify or put the key in another file, because anyone with the site files can read it. A browser console 404 for config.local.js just means no key is set. Privacy: with a key, what guests type or say to Gordon is sent to Anthropic, so mention this in the report.
