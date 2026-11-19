# Craves & Crumble: Prototype Reservation Web App (F01–F10)

A lightweight, front-end-only restaurant reservation web application built with **HTML, CSS, and vanilla JavaScript**. It requires **no build step, no framework, and no backend**, and can be run instantly by opening `index.html` in a browser.

---

## Quick Start

Open `index.html` directly in any modern browser. 
*Note: To fully enable the 3D interactive avatar (Gordon), run the site through a local development server (such as VS Code Live Server or GitHub Pages). Opening via `file://` will fall back to static image avatars.*

---

## Page & Frame Routing

| Frame | Page / Component | Description & Behavior |
| :--- | :--- | :--- |
| **F01 Home** | `index.html` | Landing page with global navigation, branding, and entry points. |
| **F02 Choose Location** | Modal pop-up | Triggered by "Reserve" buttons on `index.html`. |
| **F03 Booking Page** | `booking.html` (Step 1) | Date, time, and party size selector. |
| **F04 Times Available** | `booking.html` (Step 2) | Displayed after clicking "Find a table". |
| **F05 Time is Full** | `booking.html` (Step 2) | Triggered when picking a fully booked slot (2 fake booked times per day). |
| **F06 No Times That Date** | `booking.html` (Step 2) | Triggered on fully booked dates (7th, 14th, 21st, 28th). Mondays are closed. |
| **F07 Seating & Table** | Modal pop-up | Triggered from the "Choose your table" interface. |
| **F08 Dietary Needs** | `booking.html` (Step 4) | Dietary restriction and allergy inputs. |
| **F09 Review & Contact** | `booking.html` (Step 5) | Contact details confirmation (try a short phone number to test validation). |
| **F10 Confirmed** | `confirmed.html` | Final booking success screen. |

---

## Core Architecture & Behavior

* **Data & State:** Availability is simulated via demo data in `js/booking.js`. User selections remember their chosen location across the session.
* **Form Flow:** Completed booking steps automatically collapse into a single summary line with an **Edit** link. Modifying Step 1 after a search clears previous results. 
* **Validation Rules:** Mondays, past dates, and elapsed times today cannot be searched (informative messaging displays beneath "Find a table").
* **Styling:** Global design tokens and color schemes are centrally maintained as CSS variables at the top of `css/styles.css`.
* **Deployment Rule:** When copying files to a new repository, copy the entire directory structure together.

---

## Gordon: Voice & Typing Assistant

Click the floating bubble in the bottom-right corner to interact with **Gordon**, the built-in assistant.

* **Text Parsing (`js/gordon-parser.js` & `js/gordon.js`):** Gordon processes typed inputs natively without an external AI or server backend, validating inputs against standard form rules. 
  * *Try typing:* `"4 people this Sunday at 11"`, `"actually make it 3"`, `"10 people"`, `"at 3pm"`, `"high-top"`, `"nut allergy"`, or a phone number followed by `"yes"`.
* **3D Avatar (`js/gordon-waffle.js`):** an original round waffle character built from **Three.js** shapes (stored locally in `vendor/`, no model file, no CDN). He blinks, follows the pointer, moves his mouth while talking and changes face with the chat. Requires a local web server; opened from `file://` he uses two still images instead. The old Priest-based model (`models/gordon.glb`, `images/old-priest/`) is kept but no longer used.
* **Voice Interaction:** Click **Talk** to use speech recognition. Your speech appears live in captions, and Gordon responds aloud (toggle sound via the top navigation bar). 
  * **Privacy:** Uses on-device speech recognition where supported (modern Chrome/Edge via built-in English speech packs), ensuring no audio data leaves your machine. Fallback relies on native browser online speech recognition. Text input instantly reverts control back to the keyboard.

---

## Full French Localization (R-19)

* **Bilingual UI (`js/i18n.js`):** Every page features a **Français/English** toggle in the navigation bar. Dynamically translates all visible text elements across the entire user journey—including localized dates (*"dimanche 15 novembre"*) and times (*"11 h 30"*). Preferences sync across sessions via `localStorage` and tie directly into Gordon’s language state.
* **Gordon en Français (`js/gordon-lang.js`):** Translates French inputs (*"4 personnes dimanche à 11 h"*, `"table basse"*, `"oui"*) into parser-compatible tokens while shifting speech and listening pipelines to `fr-CA`.

---

## Gordon's Accessibility & Help Tools

`js/assist.js` injects a robust accessibility toolbar across all pages:

* **Speak & Help:** Quick voice/text welcome messages detailing what Gordon can accomplish on the current screen.
* **Read Page:** Reads main content chunks (or open modals) aloud sequentially, highlighting the active block visually while displaying live text. Automatically skips navigation, hidden elements, and input fields.
* **Guide Me:** Breaks page workflows into concise step-by-step overlays (3 steps on Home, 5 on Booking, 5 on Confirmation) featuring **Previous**, **Next**, **Repeat**, and **Exit** controls, complete with dashed visual bounding boxes around target elements.
* **Voice Commands:** Control the app hands-free using natural phrases like `"Open help"`, `"Read page"`, `"Guide me"`, `"Next"`, `"Back"`, `"Repeat"`, `"Exit"`, or `"Stop reading"` (fully supported in both English and French). 
* **Accessibility Polish:** Full keyboard focus trapping, `Esc` key modal dismissals, and dynamic mobile viewports ensuring screens scroll cleanly above active helper panels.

---

## Gordon's voice (free AI, British)

js/gordon-voice.js gives Gordon one voice for his booking panel and his help tools. In English he uses Kokoro-82M, a free, open text-to-speech model (Apache-2.0), with its British male voice `bm_george` at normal speed. It runs on the guest's own computer in a Web Worker (js/gordon-voice-worker.js) through kokoro-js, which is self-hosted in vendor/kokoro. No API key, no account, and the words he says never leave the browser.

- Quality: with WebGPU (recent Chrome or Edge on most laptops and desktops) he loads the full-precision model (fp32, about 310 MB the first time), which sounds smoothest. Without WebGPU he uses the smaller q8 model (about 90 MB). The browser console says which one loaded ("Gordon AI voice ready: ...").
- The model only downloads the first time he speaks, from Hugging Face, and the ONNX Runtime files load from cdn.jsdelivr.net. The browser caches both, so later visits start in a few seconds. He says when the voice is loading and when it's ready.
- While it loads he waits up to 20 seconds rather than switching voices (his words are already on screen). He joins sentences into longer pieces so there are fewer gaps, and fades each piece in and out so it doesn't click.
- Backup: when the AI voice can't play he uses a voice built into the computer (a British male one when there is one) and says why once: opened straight from the file (workers need a local server such as VS Code Live Server or GitHub Pages), no internet on the first load, or still downloading. If he sounds robotic, that message tells you it's the backup voice.
- French always uses a built-in French voice, since Kokoro has no French Canadian voice.
- Speed: the model starts loading as soon as the guest opens Gordon's panel. The first sentence of each line is made on its own so he starts quickly, and the next part is made while he speaks (Read page also prepares the next block ahead). On a computer without WebGPU each line still takes a moment to make.
- Whose turn it is: a bar under his picture says "Gordon is talking", "Listening. Your turn, speak now." (red, with a pulsing dot) or "Gordon is thinking". A short rising beep means the mic just opened, a falling beep means it closed. The mic is off while he talks, so he never hears himself; press Stop to cut in.
- Home and confirmation pages understand everyday wording with Voice commands on ("I want to book a table for Sunday", "can you read this", "how do I do this"), show "You said: ..." and say which phrases work if he didn't get it. "Book a table" (or Next on the last step of the home guide) takes the guest to booking with Gordon open and the Talk button highlighted: one press and he's listening. Browsers don't let a new page start the mic or sound on its own.
- To try another voice, change `VOICE` at the top of js/gordon-voice.js (bm_fable, bm_lewis, bm_daniel). `SPEED` sets his pace.
- The sass is in his wording (js/gordon-lang.js and js/assist.js). The model can't act out emotions, so it reads every line in the same friendly tone.

---

## Guest data privacy

Nothing is stored while the guest fills in the form. When they confirm, js/common.js (saveBooking) keeps only what the confirmation page shows: the first name, the last 4 digits of the phone and how many dietary needs were noted. The full name, full number, email, dietary/health needs and notes are never stored. That small record is encrypted with AES-GCM (Web Crypto API) using a fresh, non-extractable key kept in IndexedDB, and the encrypted copy sits in sessionStorage, which is wiped when the tab closes. Limit: encryption in the browser can't stop a script running on the same site, because it can use the same key. So the real protection is storing as little as possible and adding no third-party scripts. The warning comment in common.js explains this.

---

## Optional: Gordon with Claude (local demo only)

By default Gordon understands guests with the built-in parser (js/gordon-parser.js). For a demo on your own computer he can use Claude instead, which copes with casual wording ("me, my partner and our 2 kids this Sunday around 10ish") and answers questions about the restaurant.

Setup:
1. Copy `js/config.example.js` to `js/config.local.js`.
2. Put your Anthropic API key in `config.local.js` (and only there). Set a low monthly spend limit for that key in the Anthropic Console.
3. Open booking.html and talk to Gordon. "Gordon is thinking…" shows while he waits for Claude.

How it works (js/gordon-ai.js): each guest message goes to Claude (model `claude-opus-5-5` by default, low effort; `claude-haiku-5-5` is faster and cheaper, set it in the config) with the restaurant's facts and a strict JSON format. Claude only reads details and answers questions. Every value it returns is checked against fixed lists and formats, then Gordon runs the same rules as the plain form (party limit, Mondays, brunch hours, availability) before filling anything in. If there's no key, the call fails three times, times out (12 s) or is declined, he uses the built-in parser. The SDK is self-hosted in vendor/anthropic (bundled from @anthropic-ai/sdk 1.10.0) and is only loaded when a key is set.

Safety: `.gitignore` keeps `js/config.local.js` out of GitHub. Never commit it, upload it to Netlify or put the key in another file, because anyone with the site files can read it. A browser console 404 for config.local.js just means no key is set. Privacy: with a key, what guests type or say to Gordon is sent to Anthropic, so mention this in the report.

---

## Usability heuristics in Gordon's panel (js/gordon-ux.js)

The plain site already shows status and errors step by step. Gordon's panel now makes the same things clear for the assistant:
- **Visibility of system status:** an always-on status line under his picture: "Your turn", Listening, Thinking, Talking, or Loading his voice (with %). "Loading Gordon…" shows over his picture until the 3D view appears.
- **Recognition rather than recall:** "Your booking so far" chips (place, people, day, time, seat, diet, name and phone). Solid chips are filled, dashed ones are still to come. Time only counts once it has been checked and is free.
- **User control and freedom:** fields Gordon fills get a "Filled by Gordon" tag until the guest edits them.
- **Gestalt:** proximity (picture, status and booking-so-far form one card, quick replies sit on the text box), similarity (all Gordon lines are tan bubbles on the left, all guest lines are outlined bubbles on the right), common region (help tools in their own labelled box).

---

## Waitlist and live wait (Could: R-4, R-5, R-9)

- **R-4 Join waitlist:** js/waitlist.js adds a plain "Join waitlist" link beside Reserve on every page (Reserve stays the main button). On the booking page, when today has no table at the chosen time, it also shows "Arriving soon? Join today's waitlist instead."
- **R-5 Wait first:** waitlist.html (js/waitlist-page.js) shows parties waiting and the estimated minutes for the chosen location before asking for anything, with one Join button. Then name, party size (1 to 8) and mobile number. The guest's place in line moves up by itself every 20 seconds. Closed days and hours get their own message (Mondays, before 8:30 am, after 1:30 pm).
- **R-9 Live wait:** confirmed.html (js/livewait.js) shows "Your table is on time" or the expected wait from 15 minutes before the booking until the 15-minute hold ends, updating every 20 seconds without reloading.
- The numbers are simulated in the browser like availability (no backend). Nothing about a waitlist guest is stored, only the first name and last 4 digits are kept in memory until the page closes.
- **Presenting outside 9 am to 1:30 pm:** add `?demo=1` to waitlist.html or confirmed.html. The waitlist clock moves to opening hours and the live wait starts 10 minutes before the booking. The confirmation page also has a "Presenting? Preview the live wait" link.
- English and French, and a phone layout, like the rest of the site.

---

## What Gordon understands (built-in parser, js/gordon-parser.js)

Tested with about 200 phrases in English and French (R-15 to R-18). A few examples per detail:
- **Party size:** "4 people", "table for two", "there are 4 of us", "we're five", "family of 4", "2 adults and 2 kids", "me and my husband and our 2 kids", "me plus 3", "just me", "a dozen", "4 total". Changes: "actually make it 3", "one more person", "two more people", "one less".
- **Correcting yourself:** "four wait no five", "Sunday, sorry, Saturday", "at 10, I mean 11", "4 no 5", "scratch that". What comes after the correction wins.
- **Date:** "tomorrow", "this Sunday", "next Saturday", "this weekend", "next weekend", "Sunday next week", "in 3 days", "a week from today", "Dec 13", "December thirteenth", "the 22nd", "12/13". When a day is full, "sure" takes the next free day he offers.
- **Time:** "11", "11 am", "11:30", "eleven thirty", "half past ten", "half ten", "10ish", "around 10", "noon", "9 in the morning", "as early as possible", "latest you have". "Quarter past 11" gets the two nearest half hours. When he offers two times: "the earlier one", "the later one", "the first one".
- **Location:** Oshawa, Toronto, "downtown".
- **Seating:** "high-top", "at the bar", "low table", "wheelchair", "stroller", "high chair", "no high tops", "no preference", "whatever is free".
- **Dietary:** nuts, gluten, dairy, vegetarian or vegan, shellfish, plus notes for egg, soy, sesame, fish, halal, kosher, no pork, pregnant, diabetic. "No allergies", "we eat anything".
- **Name and phone:** "my name is", "call me", "put it under", "905 555 0100", "(905) 555-0100", spoken digits ("nine oh five...").
- **Confirming:** "yes", "looks good", "sounds great", "go for it", "absolutely". A "yes" that also changes something ("sure, make it 4") reads the summary back again instead of booking. "Not quite", "hold on" or "change the time" let the guest change one item.
