// Gordon's built-in parser. No AI and no server: plain rules that pull booking details out of
// what the guest types (or, later, says). It only READS details; js/gordon.js checks every value
// against the booking rules before using it.
//
// parse(text, today, asking) returns any of:
//   location, party, partyTooBig, date, dateText, time, timeProblem, timeNear, seating,
//   dietary, notes, name, phone, phoneBad, yes, no, none, wantsForm, wantsChange

const GordonParser = (() => {
  const NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, fifteen: 15, twenty: 20, a: 1, an: 1, couple: 2, pair: 2 };
  const NUMRE = '(\\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty)';
  const toNum = (w) => (/^\d+$/.test(w) ? Number(w) : NUM[w]);
  const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const MONRE = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';

  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fromISO = (s) => new Date(s + 'T12:00:00');
  function makeDate(today, month, day) { // month 0-11; rolls to next year if already past
    const t = fromISO(today);
    let d = new Date(t.getFullYear(), month, day, 12);
    if (d.getMonth() !== month) return null; // e.g. Feb 31
    if (iso(d) < today) d = new Date(t.getFullYear() + 1, month, day, 12);
    return iso(d);
  }

  // Removes a matched span so the same words aren't read twice (e.g. "15th" as a party size)
  function take(state, re) {
    const m = state.text.match(re);
    if (m) state.text = state.text.replace(m[0], ' ');
    return m;
  }

  function parseDate(s, today) {
    let m;
    if ((m = take(s, /\bday after tomorrow\b/))) { const d = fromISO(today); d.setDate(d.getDate() + 2); return iso(d); }
    if ((m = take(s, /\b(today|tonight|this morning)\b/))) return today;
    if ((m = take(s, /\b(tomorrow|tmrw|tmr)\b/))) { const d = fromISO(today); d.setDate(d.getDate() + 1); return iso(d); }
    // 2026-11-15
    if ((m = take(s, /\b(20\d\d)-(\d\d)-(\d\d)\b/))) return `${m[1]}-${m[2]}-${m[3]}`;
    // November 15, nov 15th
    if ((m = take(s, new RegExp(`\\b${MONRE}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`)))) return makeDate(today, MONTHS.indexOf(m[1].slice(0, 3)), Number(m[2]));
    // 15 November, 15th of nov
    if ((m = take(s, new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONRE}\\b`)))) return makeDate(today, MONTHS.indexOf(m[2].slice(0, 3)), Number(m[1]));
    // 11/15 (month/day)
    if ((m = take(s, /\b(\d{1,2})\/(\d{1,2})\b/))) return makeDate(today, Number(m[1]) - 1, Number(m[2]));
    // (this|next|on) sunday
    if ((m = take(s, /\b(?:(this|next|on|coming)\s+)?(sun|mon|tues?|wed(?:nes)?|thu(?:rs?)?|fri|sat(?:ur)?)(?:day)?\b/))) {
      const want = DAYS.findIndex(d => d.startsWith(m[2].slice(0, 3)));
      const d = fromISO(today);
      let add = (want - d.getDay() + 7) % 7;
      if (m[1] === 'next' && add === 0) add = 7;
      d.setDate(d.getDate() + add);
      return iso(d);
    }
    // the 15th
    if ((m = take(s, /\b(?:the\s+)?(\d{1,2})(st|nd|rd|th)\b/))) {
      const t = fromISO(today);
      const day = Number(m[1]);
      let d = new Date(t.getFullYear(), t.getMonth(), day, 12);
      if (iso(d) < today) d = new Date(t.getFullYear(), t.getMonth() + 1, day, 12);
      return d.getDate() === day ? iso(d) : null;
    }
    return undefined;
  }

  // Returns {time: '11:00 am'} or {problem, near: [...]} for times outside brunch or off the half hour
  function parseTime(s, asking) {
    let h, min = 0, ap = null, m;
    if ((m = take(s, /\b(noon|midday|lunch ?time)\b/))) { h = 12; ap = 'pm'; }
    else if ((m = take(s, /\bhalf past (\d{1,2})\b/))) { h = Number(m[1]); min = 30; }
    else if ((m = take(s, /\b(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)?/))) { h = Number(m[1]); min = Number(m[2]); ap = m[3]; }
    else if ((m = take(s, /\b(\d{1,2})\s*(a\.?m\.?|p\.?m\.?)/))) { h = Number(m[1]); ap = m[2]; }
    else if ((m = take(s, /\b(?:at|around|by|about)\s+(\d{1,2})(?:\s*o'?clock)?\b(?!\s*(?:people|guests|of us|persons?|pax|ppl))/))) { h = Number(m[1]); }
    else if (asking === 'time' && (m = take(s, /\b(\d{1,2})\b/))) { h = Number(m[1]); } // "maybe 11 then"
    else if ((m = take(s, /\b(\d{1,2}) o'?clock\b/))) { h = Number(m[1]); }
    else return undefined;

    ap = ap ? ap.replace(/\./g, '')[0] : null;
    if (h > 12 && h < 24) { ap = 'p'; h -= 12; }
    if (!ap) ap = (h >= 9 && h <= 11) ? 'a' : 'p'; // brunch: 9-11 am, 12-1 pm
    const mins = ((h % 12) + (ap === 'p' ? 12 : 0)) * 60 + min;
    const label = (x) => { const hh = Math.floor(x / 60), mm = x % 60; return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'am' : 'pm'}`; };
    if (mins < 9 * 60 || mins > 13 * 60 + 30) return { problem: 'outside', said: label(mins) };
    if (mins % 30) {
      const down = mins - (mins % 30), up = down + 30;
      return { problem: 'half', said: label(mins), near: [label(down), up <= 13 * 60 + 30 ? label(up) : null].filter(Boolean) };
    }
    return { time: label(mins) };
  }

  function parseParty(s, asking) {
    let m;
    if ((m = take(s, /\b(just me|only me|myself|by myself|solo|table for one)\b/))) return 1;
    if ((m = take(s, new RegExp(`\\bme and ${NUMRE} (?:friends?|others?|people|guests|of my friends|colleagues|kids)\\b`)))) return toNum(m[1]) + 1;
    if ((m = take(s, /\bme and (?:my |a )?(?:wife|husband|partner|friend|mom|mum|dad|son|daughter|date|girlfriend|boyfriend|sister|brother|colleague)\b/))) return 2;
    if ((m = take(s, new RegExp(`\\b(?:party of|table for|group of|for|make it|change it to|actually)\\s+${NUMRE}\\b(?!\\s*(?:am|pm|a\\.m|p\\.m|:|o'?clock))`)))) return toNum(m[1]);
    if ((m = take(s, new RegExp(`\\b${NUMRE}\\s+(?:people|persons?|guests|adults|of us|pax|ppl|diners|seats)\\b`)))) return toNum(m[1]);
    if ((m = take(s, /\b(a couple|the two of us|us two|a pair)\b/))) return 2;
    if (asking === 'party' && (m = take(s, new RegExp(`\\b${NUMRE}\\b`)))) return toNum(m[1]); // "ok 4 then"
    return undefined;
  }

  function parse(raw, today, asking) {
    const out = {};
    const s = { text: ' ' + raw.toLowerCase().replace(/[!?]/g, ' ').replace(/\s+/g, ' ') + ' ' };
    const t = s.text;

    if (/\b(use the form|fill (it|the form) (in )?myself|i'?ll do it myself|stop|cancel|close|go away|never ?mind)\b/.test(t)) out.wantsForm = true;
    if (/\b(change|edit|fix|wrong|not right|different)\b/.test(t)) out.wantsChange = true;

    // Phone before numbers are read as times or party sizes
    const digits = t.replace(/[^\d]/g, '');
    const pm = s.text.match(/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/);
    if (pm) { s.text = s.text.replace(pm[0], ' '); out.phone = pm[0].replace(/\D/g, '').slice(-10); }
    else if (asking === 'phone' && digits.length) out.phoneBad = true;

    // Email-free name patterns ("my name is", "under", or a plain reply when asked)
    let m = s.text.match(/(?:^|\s)(?:my name is|name is|name's|under the name(?: of)?|book it under|under)\s+(\p{L}[\p{L}'.-]*(?:\s+\p{L}[\p{L}'.-]*){0,3})/u);
    if (m) { out.name = m[1]; s.text = s.text.replace(m[0], ' '); }
    else if (asking === 'name') {
      m = s.text.match(/^\s*(?:i'?m |i am |it'?s |this is )?(\p{L}[\p{L}'.-]*(?:\s+\p{L}[\p{L}'.-]*){0,3})\s*$/u);
      if (m && !/^(yes|no|yeah|nope|ok|okay|sure)$/.test(m[1])) { out.name = m[1]; s.text = ' '; }
    }
    if (out.name) {
      out.name = out.name.split(/\s+(?:and|my|with|for|at|on|please|number|phone|thanks?|thank)\b/)[0];
      out.name = out.name.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    if (/\boshawa\b/.test(s.text)) out.location = 'Oshawa';
    if (/\btoronto\b/.test(s.text)) out.location = 'Toronto';

    const date = parseDate(s, today);
    if (date !== undefined) out.date = date; // null means "a date that doesn't exist"

    const time = parseTime(s, asking);
    if (time) { if (time.time) out.time = time.time; else { out.timeProblem = time.problem; out.timeSaid = time.said; out.timeNear = time.near; } }

    const party = parseParty(s, asking);
    if (party !== undefined) out.party = party;

    if (/\b(high[- ]?tops?|high tables?|high seat(ing)?|tall table|bar seat(ing)?|stools?)\b/.test(t)) out.seating = 'High';
    else if (/\b(low tables?|low seat(ing)?|regular table|normal table|lower table|wheelchair|accessible)\b/.test(t) || (asking === 'seating' && /\blow\b/.test(t))) out.seating = 'Low';
    else if (asking === 'seating' && /\bhigh\b/.test(t)) out.seating = 'High';
    else if (asking === 'seating' && /\b(no preference|either|any|don'?t mind|doesn'?t matter|whatever|no pref)\b/.test(t)) out.seating = 'none';

    const diet = [];
    if (/\b(nut|nuts|peanuts?|tree nuts?)\b/.test(t)) diet.push('Nut allergy');
    if (/\b(gluten|celiac|coeliac)\b/.test(t)) diet.push('Gluten-free');
    if (/\b(dairy|lactose|milk allergy)\b/.test(t)) diet.push('Dairy-free');
    if (/\b(vegetarian|vegan|veggie|no meat)\b/.test(t)) diet.push('Vegetarian');
    if (/\b(shellfish|shrimp|prawns?|lobster|crab)\b/.test(t)) diet.push('Shellfish allergy');
    if (diet.length) out.dietary = diet;
    if (/\bvegan\b/.test(t)) out.notes = 'Vegan';

    if (/^\s*(y|yes|yeah|yep|yup|sure|ok|okay|please|please do|book it|go ahead|confirm|correct|that'?s right|sounds good|perfect|do it)\b/.test(t)) out.yes = true;
    if (/^\s*(n|no|nope|nah|not really|none|nothing|no thanks|no thank you)\b/.test(t)) out.no = true;
    if (/\b(none|nothing|no allergies|no dietary|no restrictions|all good|we'?re fine)\b/.test(t)) out.none = true;

    return out;
  }

  return { parse };
})();

if (typeof module !== 'undefined') module.exports = GordonParser; // for quick tests in Node
