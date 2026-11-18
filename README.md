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
* **3D Avatar (`models/gordon.glb`):** Rendered using **Three.js** (stored locally in `vendor/` with no external CDN dependency). Requires a local web server to load the 3D model; otherwise gracefully defaults to dual static images. Model derived from Valve’s *Deadlock* "Priest" model via `gordon-avatar/scripts/web-export.py`.
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
