// Gordon's built-in parser. No AI and no server: plain rules that pull booking details out of
// what the guest types (or, later, says). It only READS details; js/gordon.js checks every value
// against the booking rules before using it.
//
// parse(text, today, asking) returns any of:
//   location, party, partyTooBig, date, dateText, time, timeProblem, timeNear, seating,
//   dietary, notes, name, phone, phoneBad, yes, no, none, wantsForm, wantsChange,
//   partyDelta ("one more person" = +1) and pick ('earlier' or 'later' of the offered times);
//   js/gordon.js turns those two into a party size and a time.

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

  // ---------- Spoken and casual wording, turned into the forms the rules below read ----------
  const WORDS = { zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
    twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50 };
  const ORD = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
    eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17, eighteenth: 18,
    nineteenth: 19, twentieth: 20, thirtieth: 30 };
  const sfx = (n) => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');
  const UNITS = 'one|two|three|four|five|six|seven|eight|nine';
  function normalize(t, asking) {
    t = t.replace(/\bo\s?clock\b/g, "o'clock").replace(/\b(?:around |about )?(\d{1,2})\s*-?ish\b/g, 'around $1').replace(/\b(\w+)ish\b/g, (m, w) => (w in WORDS ? 'around ' + w : m));
    t = t.replace(/\ba dozen\b/g, '12').replace(/\bhalf a dozen\b/g, '6');
    // ordinal words: "twenty second" -> 22nd, "thirteenth" -> 13th ("first"/"second" only next to a month)
    t = t.replace(new RegExp(`\\b(twenty|thirty)[- ](first|second|third|fourth|fifth|sixth|seventh|eighth|ninth)\\b`, 'g'), (m, a, b) => sfx(WORDS[a] + ORD[b]));
    t = t.replace(/\b(third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth|thirtieth)\b/g, (m) => sfx(ORD[m]));
    t = t.replace(new RegExp(`\\b(first|second)(?=\\s+(?:of\\s+)?${MONRE}\\b)`, 'g'), (m) => sfx(ORD[m]));
    t = t.replace(new RegExp(`(?<=\\b${MONRE}\\.?\\s+(?:the\\s+)?)(first|second)\\b`, 'g'), (m) => sfx(ORD[m]));
    if (asking === 'date') t = t.replace(/\bthe (first|second)\b(?!\s+one)/g, (m, w) => 'the ' + sfx(ORD[w]));
    // number words: "twenty one" -> 21, "eleven" -> 11 (but not "one more", "the first one", "no one")
    t = t.replace(new RegExp(`\\b(twenty|thirty|forty|fifty)[- ](${UNITS})\\b`, 'g'), (m, a, b) => String(WORDS[a] + WORDS[b]));
    t = t.replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fourty|fifty)\b/g, (m, w, i, all) => {
      if (w === 'one' && (/\b(the|that|this|which|any|no|every|some|each|other|first|second|earlier|later|last|toronto|oshawa)\s+$/.test(all.slice(0, i)) || /^\s+(of|another|sec|second|moment|minute|min)\b/.test(all.slice(i + 3)))) return m;
      return String(WORDS[w]);
    });
    // "oh" as zero, only inside spoken digits ("nine oh five")
    t = t.replace(/(?<=\b\d\s+)oh(?=\s+\d\b)/g, '0');
    // spoken phone numbers: "9 0 5 5 5 5 0 1 0 0" -> 9055550100
    t = t.replace(/\b\d(?:[\s,.-]+\d){9,10}\b/g, (m) => m.replace(/\D/g, ''));
    t = t.replace(/\b(\d{3})\s+(\d{3})\s+(\d{2})\s+(\d{2})\b/g, '$1$2$3$4');
    return t;
  }

  function parseDate(s, today, asking) {
    let m;
    const plus = (n) => { const d = fromISO(today); d.setDate(d.getDate() + n); return iso(d); };
    const comingDay = (want) => (want - fromISO(today).getDay() + 7) % 7; // days until that weekday (0 = today)
    if ((m = take(s, /\bday after tomorrow\b/))) return plus(2);
    if ((m = take(s, /\b(?:a|1|one) week (?:from|after) (today|tomorrow|now)\b|\bin (?:a|1) week\b|\bthis time next week\b/))) return plus(m[1] === 'tomorrow' ? 8 : 7);
    if ((m = take(s, /\bin (\d{1,2}) days?\b/))) return plus(Number(m[1]));
    if ((m = take(s, /\b(this|next|the|on the|coming)?\s*week ?ends?\b/))) {
      const sat = comingDay(6), sun = comingDay(0);
      const first = sun < sat ? sun : sat; // on a Sunday "this weekend" is today
      return plus(m[1] === 'next' ? sat + 7 : first);
    }
    // "sunday next week", "next week sunday", "next week on sunday"
    if ((m = take(s, /\b(?:(sun|mon|tues?|wed(?:nes)?|thu(?:rs?)?|fri|sat(?:ur)?)(?:day)?\.?\s+(?:of\s+)?next week|next week(?:\s+on)?\s+(sun|mon|tues?|wed(?:nes)?|thu(?:rs?)?|fri|sat(?:ur)?)(?:day)?)\b/))) {
      const want = DAYS.findIndex(d => d.startsWith((m[1] || m[2]).slice(0, 3)));
      const now = fromISO(today).getDay(), toMonday = (8 - now) % 7 || 7;
      let add = comingDay(want); if (add < toMonday) add += 7;
      return plus(add);
    }
    if ((m = take(s, /\b(today|tonight|this morning|later today)\b/))) return today;
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
    if ((m = take(s, /\b(?:(this|next|on|coming|this coming)\s+)?(sun|mon|tues?|wed(?:nes)?|thu(?:rs?)?|fri|sat(?:ur)?)(?:day)?\b\.?(?:\s+the\s+(?=\d{1,2}(?:st|nd|rd|th)))?/))) {
      const want = DAYS.findIndex(d => d.startsWith(m[2].slice(0, 3)));
      const d = fromISO(today);
      let add = (want - d.getDay() + 7) % 7;
      if (m[1] === 'next' && add === 0) add = 7;
      d.setDate(d.getDate() + add);
      return iso(d);
    }
    // the 15th
    if ((m = take(s, /\b(?:the\s+)?(\d{1,2})(st|nd|rd|th)\b/)) || (asking === 'date' && (m = take(s, /^\s*(?:the\s+|on the\s+)?(\d{1,2})\s*$/)))) {
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
    s.text = s.text.replace(/\b(\d{1,2})\s+in the morning\b/, '$1 am').replace(/\b(\d{1,2})\s+in the afternoon\b/, '$1 pm');
    if ((m = take(s, /\b(?:as early as (?:possible|you can|we can)|earliest(?: (?:time|slot|table|one|possible))?|first thing(?: in the morning)?|(?:right )?(?:at|when you) open(?:ing)?|opening(?: time)?)\b/))) { h = 9; ap = 'am'; }
    else if ((m = take(s, /\b(?:as late as (?:possible|you can)|latest(?: (?:time|slot|table|one|possible))?|last (?:seating|slot|time|table))\b/))) { h = 1; min = 30; ap = 'pm'; }
    else if ((m = take(s, /\b(?:12\s+)?(noon|midday|lunch ?time)\b/))) { h = 12; ap = 'pm'; }
    else if ((m = take(s, /\bquarter (past|after) (\d{1,2})\b/))) { h = Number(m[2]); min = 15; }
    else if ((m = take(s, /\bquarter (to|before|of) (\d{1,2})\b/))) { h = Number(m[2]) - 1; min = 45; }
    else if ((m = take(s, /\bhalf (?!past)(\d{1,2})\b/))) { h = Number(m[1]); min = 30; } // British "half ten
    else if ((m = take(s, /\bhalf past (\d{1,2})\b/))) { h = Number(m[1]); min = 30; }
    else if ((m = take(s, /\b(\d{1,2})[:.](\d{2})\s*(a\.?m\.?|p\.?m\.?)?/))) { h = Number(m[1]); min = Number(m[2]); ap = m[3]; }
    else if ((m = take(s, /\b(\d{1,2})\s+(00|15|30|45)\b(?!\s*(?:people|guests|of us|persons?|pax|ppl))\s*(a\.?m\.?|p\.?m\.?)?/))) { h = Number(m[1]); min = Number(m[2]); ap = m[3]; } // "eleven thirty"
    else if ((m = take(s, /\b(\d{1,2})\s*(a\.?m\.?|p\.?m\.?)/))) { h = Number(m[1]); ap = m[2]; }
    else if ((m = take(s, /\b(?:at|around|by|about|maybe|say|approx(?:imately)?|time (?:to|at|for|of)|move it to|push it to|make it at)\s+(?:around\s+|about\s+)?(\d{1,2})(?:\s*o'?clock)?\b(?!\s*(?:people|guests|of us|persons?|pax|ppl|adults|kids|more|less|fewer|days?|weeks?))/))) { h = Number(m[1]); }
    else if (asking === 'time' && (m = take(s, /\b(\d{1,2})\b(?!\s*(?:people|guests|of us|persons?|pax|ppl|more|less|fewer))/))) { h = Number(m[1]); } // "maybe 11 then"
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
    // adults plus children: "2 adults and 2 kids", "3 of us and a baby"
    const KID = '(?:kids?|children|child|babies|baby|toddlers?|infants?|teens?|teenagers?|seniors?|grand ?kids?|grandchildren)';
    const grp = [...s.text.matchAll(new RegExp(`\\b(\\d{1,2}|a|an|our|my)\\s+(?:little\\s+|young\\s+|small\\s+)?(adults?|grown-?ups|${KID})\\b`, 'g'))];
    if (grp.length && grp.some(g => !/^(adults?|grown-?ups)$/.test(g[2]) || grp.length > 1)) {
      let n = grp.reduce((a, g) => a + (/^\d/.test(g[1]) ? Number(g[1]) : 1), 0);
      grp.forEach(g => { s.text = s.text.replace(g[0], ' '); });
      if (/\b(me|myself|i)\b/.test(s.text) && !/adults?|grown/.test(grp.map(g => g[2]).join(' '))) n += 1; // "me and 2 kids"
      if (/\b(?:my|a) (wife|husband|partner|spouse|friend|mom|mum|mother|dad|father|girlfriend|boyfriend|fiance|fiancee|sister|brother|colleague|date)\b/.test(s.text) && !/adults?|grown/.test(grp.map(g => g[2]).join(' '))) n += 1;
      return n;
    }
    // partner or friend plus children: "me and my husband and our 2 kids"
    const REL = '(?:wife|husband|partner|spouse|friend|mom|mum|mother|dad|father|son|daughter|date|girlfriend|boyfriend|fiance|fiancee|sister|brother|colleague|coworker|boss|grandma|grandpa|aunt|uncle|cousin)';
    if ((m = take(s, new RegExp(`\\b(?:me|myself|i) (?:and|plus|with|\\+) (?:my |a )?${REL}s?\\b|\\b(?:my |a )?${REL} and (?:i|me|myself)\\b`)))) {
      let n = 2;
      const more = take(s, new RegExp(`\\band (?:our|my|the|their) (\\d{1,2}) ${KID}\\b`)) ;
      if (more) n += Number(more[1]);
      else if (take(s, new RegExp(`\\band (?:our|my|the|their|a) ${KID.replace('(?:', '(?:son|daughter|')}\\b`))) n += 1;
      return n;
    }
    if ((m = take(s, new RegExp(`\\b(?:me|myself|i) (?:and|plus|with|\\+) ${NUMRE}(?: (?:more|others?|other people|friends?|people|guests|of my friends|colleagues|coworkers|co-workers|family members|relatives))?\\b`)))) return toNum(m[1]) + 1;
    if ((m = take(s, /\b(just me|only me|myself|by myself|solo|table for one|just myself|only myself|on my own|alone|party of one|1 person)\b/))) return 1;
    if (asking === 'party' && (m = take(s, /^\s*(?:it'?s |it is )?(?:just |only )?(?:me|i|myself)\s*$/))) return 1;
    if ((m = take(s, new RegExp(`\\b(?:we are|we're|we re|we will be|we'll be|we'd be|there are|there're|there will be|there'll be|there's|we have|it'll be|it will be|it's|its|that's|will be|it is|should be|probably)\\s+(?:about |around |maybe |just |only |now )?${NUMRE}\\b(?!\\s*(?:am|pm|a\\.m|p\\.m|:|\\.\\d|o'?clock|days?|weeks?|minutes?|mins?))(?:\\s+(?:of us|people|persons?|guests|in total|total|now|altogether))?`)))) return toNum(m[1]);
    if ((m = take(s, new RegExp(`\\b(?:family of|a family of|group of|party of|table of|crew of|team of)\\s+${NUMRE}\\b`)))) return toNum(m[1]);
    if ((m = take(s, new RegExp(`\\b${NUMRE}\\s*(?:in total|total|altogether|all together|in all|of us total)\\b`)))) return toNum(m[1]);
    if ((m = take(s, new RegExp(`\\b${NUMRE}\\s*(?:ppl|pax|ppl\\.)\\b`)))) return toNum(m[1]);
    if ((m = take(s, new RegExp(`\\bme and ${NUMRE} (?:friends?|others?|people|guests|of my friends|colleagues|kids)\\b`)))) return toNum(m[1]) + 1;
    if ((m = take(s, /\bme and (?:my |a )?(?:wife|husband|partner|friend|mom|mum|dad|son|daughter|date|girlfriend|boyfriend|sister|brother|colleague)\b/))) return 2;
    if ((m = take(s, new RegExp(`\\bparty size (?:of |is |will be )?${NUMRE}\\b`)))) return toNum(m[1]);
    if ((m = take(s, new RegExp(`\\b(?:party of|table for|group of|for|make it|change it to|actually)\\s+${NUMRE}\\b(?!\\s*(?:am|pm|a\\.m|p\\.m|:|o'?clock))`)))) return toNum(m[1]);
    if ((m = take(s, new RegExp(`\\b${NUMRE}\\s+(?:people|persons?|guests|adults|of us|pax|ppl|diners|seats|heads|covers|folks|friends|ladies|guys|girls)\\b`)))) return toNum(m[1]);
    if ((m = take(s, new RegExp(`\\b${NUMRE}\\s+(?=(?:at|on|this|next|for brunch|tomorrow|today|sun|sat|fri|thu|wed|tue)\\b)`)))) return toNum(m[1]); // "4 at 11", "2 on Sunday"
    if ((m = take(s, /\b(a couple|the two of us|the 2 of us|us two|us 2|a pair|me and you|my other half|the wife and i|the husband and i|date night)\b/))) return 2;
    if ((m = take(s, /\b(?:just |all )?(?:the )?(\d{1,2}) of us\b/))) return Number(m[1]);
    if (asking === 'party' && (m = take(s, new RegExp(`\\b${NUMRE}\\b`)))) return toNum(m[1]); // "ok 4 then"
    return undefined;
  }

  // "one more person", "2 more people", "someone else is coming", "one less", "minus one"
  function parseDelta(t) {
    let m;
    if ((m = t.match(/\b(?:add|plus|and|with|bring(?:ing)?|another|extra)?\s*(\d{1,2}|a|an|another)\s+(?:more|extra|additional)\s*(?:person|people|guests?|adults?|kids?|friends?|seats?)?\b/)) && !/\bmore (?:time|day|week|minute)/.test(t)) return /^\d/.test(m[1]) ? Number(m[1]) : 1;
    if (/\b(?:add (?:a|another|1|one) (?:person|guest|seat|friend|chair)|another (?:person|guest|friend)|plus one|plus 1|someone else is coming|one more|1 more)\b/.test(t)) return 1;
    if ((m = t.match(/\b(\d{1,2}|a|one)\s+(?:less|fewer)\b|\bminus (\d{1,2}|one)\b|\b(?:remove|drop|take away|take off|lose) (\d{1,2}|a|one) (?:person|people|guests?|seats?)\b|\bsomeone (?:can'?t|cannot|isn'?t|won'?t|dropped)/))) {
      const w = m[1] || m[2] || m[3];
      return w && /^\d/.test(w) ? -Number(w) : -1;
    }
    return 0;
  }

  function parseOne(raw, today, asking) {
    const out = {};
    const s = { text: ' ' + normalize(raw.toLowerCase().replace(/[!?]/g, ' ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, ' '), asking) + ' ' };
    const t = s.text;

    if (/\b(use the form|fill (it|the form) (in )?myself|i'?ll do it myself|stop|cancel|close|go away|never ?mind)\b/.test(t)) out.wantsForm = true;
    if (/\b(change|edit|fix|wrong|not right|different|switch|move|update|swap|modify|instead)\b/.test(t)) out.wantsChange = true;

    // Phone before numbers are read as times or party sizes
    const digits = t.replace(/[^\d]/g, '');
    const pm = s.text.match(/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/);
    if (pm) { s.text = s.text.replace(pm[0], ' '); out.phone = pm[0].replace(/\D/g, '').slice(-10); }
    else if (asking === 'phone' && digits.length) out.phoneBad = true;

    // Email-free name patterns ("my name is", "under", or a plain reply when asked)
    let m = s.text.match(/(?:^|\s)(?:my name is|my name'?s|name is|name's|name:|names|the name'?s|call me|you can call me|under the name(?: of)?|book it under|put it under|put me down as|put us down as|put us down under|book under|reserve it under|under)\s+(\p{L}[\p{L}'.-]*(?:\s+\p{L}[\p{L}'.-]*){0,3})/u);
    if (m) { out.name = m[1]; s.text = s.text.replace(m[0], ' '); }
    else if (asking === 'name') {
      m = s.text.match(/^\s*(?:i'?m |i am |it'?s |this is )?(\p{L}[\p{L}'.-]*(?:\s+\p{L}[\p{L}'.-]*){0,3})\s*$/u);
      if (m && !/^(yes|no|yeah|nope|ok|okay|sure)$/.test(m[1])) { out.name = m[1]; s.text = ' '; }
    }
    if (out.name) {
      out.name = out.name.split(/\s+(?:and|my|with|for|at|on|please|number|phone|thanks?|thank)\b/)[0];
      out.name = out.name.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    if (/\b(oshawa|durham|osh)\b/.test(s.text)) out.location = 'Oshawa';
    if (/\b(toronto|downtown|the city|the 6ix|the six|t\.o\.|nonexistent avenue|king west)\b/.test(s.text)) out.location = 'Toronto';
    if (/\b(mockingbird)\b/.test(s.text)) out.location = 'Oshawa';

    const date = parseDate(s, today, asking);
    if (date !== undefined) out.date = date; // null means "a date that doesn't exist"

    const time = parseTime(s, asking);
    if (time) { if (time.time) out.time = time.time; else { out.timeProblem = time.problem; out.timeSaid = time.said; out.timeNear = time.near; } }

    // "one of us is vegetarian" talks about the group, it isn't a party size
    s.text = s.text.replace(/\b(?:one|\d{1,2}|some|two|all|both|none) of (?:us|them)(?= (?:is|are|has|have|needs?|can'?t|cannot|doesn'?t|don'?t|eats?|won'?t|will|may|might|gets?|also|uses?)\b)/g, ' ');
    const delta = parseDelta(s.text);
    if (delta) out.partyDelta = delta;
    const party = delta ? undefined : parseParty(s, asking);
    if (party !== undefined) out.party = party;
    // a pick from the two times Gordon offered
    if (!out.time && !out.timeProblem) {
      if (/\b(earlier|first|former|sooner|1st|earliest one)\b(?! thing)/.test(s.text) && /\b(one|time|slot|option|please|then|is fine|works|sounds)\b|^\s*(?:the )?(earlier|first|former|sooner)\s*$/.test(s.text)) out.pick = 'earlier';
      else if (/\b(later|second|latter|last|2nd)\b/.test(s.text) && /\b(one|time|slot|option|please|then|is fine|works|sounds)\b|^\s*(?:the )?(later|second|latter|last)\s*$/.test(s.text)) out.pick = 'later';
    }

    const noHigh = /\b(no|not|don'?t want|avoid|can'?t do|cannot do|can'?t use|without)\s+(?:a\s+|the\s+|any\s+)?(high|tall|bar|stools?)/.test(t);
    if (!noHigh && /\b(high[- ]?tops?|high tables?|high seat(ing|s)?|higher (table|seat(ing)?)|tall tables?|bar (seat(ing|s)?|height|stools?|tables?)|counter (height|seat(ing)?)|stools?|barstools?|sit at the bar|at the bar)\b/.test(t)) out.seating = 'High';
    else if (noHigh || /\b(low tables?|low seat(ing)?|lower (table|seat(ing)?)|regular (table|height|seat(ing)?)|normal (table|height|seat(ing)?)|standard (table|height)|table height|booth|wheelchair|accessible|accessibility|walker|mobility|cane|crutches|stroller|pram|high ?chair|booster|elderly|grandma|grandpa|no stools)\b/.test(t) || (asking === 'seating' && /\b(low|lower|regular|normal|standard)\b/.test(t))) out.seating = 'Low';
    else if (asking === 'seating' && /\b(high|higher|tall|bar|counter)\b/.test(t)) out.seating = 'High';
    else if (/\b(no preference|no pref|either is fine|either one|either works|any table|anywhere|wherever)\b/.test(t) || (asking === 'seating' && /\b(either|any|don'?t mind|doesn'?t matter|does not matter|whatever|no|none|nope|don'?t care|up to you|you choose|you pick|surprise me|whichever|fine|free)\b/.test(t))) out.seating = 'none';

    const diet = [];
    if (/\b(nut|nuts|peanuts?|tree ?nuts?|almonds?|cashews?|walnuts?|pecans?|hazelnuts?|pistachios?)\b/.test(t) && !/\b(nutmeg|coconut)\b/.test(t.replace(/\b(nut|nuts)\b/g, ''))) diet.push('Nut allergy');
    if (/\b(gluten|celiac|coeliac|wheat|gf)\b/.test(t)) diet.push('Gluten-free');
    if (/\b(dairy|lactose|milk allergy|no milk|no cheese|df)\b/.test(t)) diet.push('Dairy-free');
    if (/\b(vegetarian|vegan|veggie|no meat|plant[- ]based|don'?t eat meat|doesn'?t eat meat)\b/.test(t)) diet.push('Vegetarian');
    if (/\b(shellfish|shrimp|prawns?|lobster|crab|scallops?|mussels?|clams?|oysters?)\b/.test(t)) diet.push('Shellfish allergy');
    if (diet.length) out.dietary = diet;
    // anything else the kitchen should know goes in the notes
    const notes = [];
    if (/\bvegan\b/.test(t)) notes.push('Vegan');
    const EXTRA = [[/\beggs?\b/, 'Egg allergy'], [/\b(soy|soya)\b/, 'Soy allergy'], [/\bsesame\b/, 'Sesame allergy'], [/\b(fish|salmon|tuna)\b(?! sauce)/, 'Fish allergy'],
      [/\bhalal\b/, 'Halal'], [/\bkosher\b/, 'Kosher'], [/\bpescatarian|pescetarian\b/, 'Pescatarian'], [/\bno pork|don'?t eat pork|pork[- ]free\b/, 'No pork'],
      [/\bno beef|don'?t eat beef\b/, 'No beef'], [/\bpregnan(t|cy)\b/, 'Pregnant'], [/\b(diabetic|diabetes)\b/, 'Diabetic'], [/\bketo\b/, 'Keto'],
      [/\b(mustard)\b/, 'Mustard allergy'], [/\bcorn\b/, 'Corn allergy'], [/\b(strawberr(y|ies)|berr(y|ies))\b/, 'Berry allergy'], [/\b(epi ?pen|anaphyla\w*|severe)\b/, 'Severe allergy (EpiPen)']];
    const dietTalk = /\b(allerg\w*|intoleran\w*|sensitiv\w*|can'?t (?:eat|have)|cannot (?:eat|have)|no |free|avoid|diet\w*|eat|halal|kosher|pescatarian|pregnan|diabet|keto|epi ?pen|anaphyla)/.test(t);
    if (dietTalk) EXTRA.forEach(([re, label]) => { if (re.test(t)) notes.push(label); });
    if (notes.length) out.notes = notes.join(', ');

    if (/^\s*(y|ya|yes|yea|yeah|yeh|yep|yup|yas|sure|sure thing|ok|okay|okey|k|kk|alright|all right|please|please do|book it|go ahead|confirm(ed)?|correct|that'?s (right|correct|it|perfect|great|good|fine)|that is (right|correct)|sounds (good|great|perfect|right|fine)|perfect|great|lovely|awesome|excellent|wonderful|cool|fine|good|do it|absolutely|of course|definitely|certainly|indeed|affirmative|exactly|mhm+|uh[- ]?huh|go for it|let'?s do (it|that)|lets do it|looks? (good|great|right|perfect|correct|fine)|all (good|correct|set)|that works|works for me|right|yes please|yes book it)\b/.test(t)
      && !/\b(not|isn'?t|wrong|but|except|change|instead|actually)\b/.test(t)) out.yes = true;
    if (/^\s*(n|no|nope|nah|naw|not really|not quite|not yet|none|nothing|no thanks|no thank you|hold on|wait|hang on|one sec(ond)?|incorrect|not right|that'?s (not right|wrong|incorrect))\b/.test(t)) out.no = true;
    if (/\b(none|nothing|no allergies|no allergy|no dietary|no restrictions|no needs|no special|nothing special|nothing like that|all good|we'?re (fine|good|ok|okay)|we are (fine|good)|we can eat anything|we eat anything|eat everything|anything is fine|no issues|none of us|not that i know|no one does|no one has|no one|nobody)\b/.test(t)) out.none = true;
    if (/\b(no preference|no pref)\b/.test(t)) delete out.no;
    // a "yes" that also changes something isn't a go-ahead to book: Gordon reads the new details back first
    if (out.yes && ['party', 'partyDelta', 'date', 'time', 'timeProblem', 'location', 'seating', 'dietary', 'notes', 'name', 'phone'].some(k => k in out)) delete out.yes;

    return out;
  }

  // Self-corrections: "four wait no five", "Sunday, sorry, Saturday", "at 10, I mean 11".
  // What comes after the last correction wins. A bare number after it replaces the last number before it,
  // so "party size of four wait no five" reads as "party size of five".
  const FIX = new RegExp(`\\b(?:wait,? no|no,? wait|wait wait|no,? actually|actually,? no|no,? sorry|sorry,? no|sorry|i mean|i meant|scratch that|make that|correction|oops|or rather)\\b,?|(?<=\\b${NUMRE}\\s*,?\\s+)no,?(?=\\s+${NUMRE}\\b)`, 'g');
  function parse(raw, today, asking) {
    const low = ' ' + raw.toLowerCase() + ' ';
    let last = null;
    for (const m of low.matchAll(FIX)) last = m;
    if (!last) return parseOne(raw, today, asking);
    const before = low.slice(0, last.index), after = low.slice(last.index + last[0].length);
    if (!after.trim()) return parseOne(before, today, asking);
    const bare = after.match(new RegExp(`^[\\s,.]*(?:it'?s |make it |it'?ll be )?${NUMRE}[\\s,.]*$`));
    if (bare) {
      const nums = [...before.matchAll(new RegExp(`\\b${NUMRE}\\b`, 'g'))];
      if (nums.length) {
        const n = nums[nums.length - 1];
        const fixed = parseOne(before.slice(0, n.index) + bare[1] + before.slice(n.index + n[0].length), today, asking);
        if (Object.keys(fixed).length) return fixed;
      }
      // "wait no, five" on its own, right after Gordon repeated the party size back
      if (asking !== 'time' && asking !== 'phone' && toNum(bare[1]) <= 20) return { party: toNum(bare[1]) };
    }
    const a = parseOne(before, today, asking), b = parseOne(after, today, asking);
    if (b.time || b.timeProblem) { delete a.time; delete a.timeProblem; delete a.timeSaid; delete a.timeNear; }
    return Object.assign(a, b);
  }

  return { parse };
})();

if (typeof module !== 'undefined') module.exports = GordonParser; // for quick tests in Node
