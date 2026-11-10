// Whole-site French (R-19 extended): a Français / English switch in the nav of every page.
// How it works: the pages are written in English. When French is on, this file swaps every visible
// text (and alt, placeholder, aria-label and title) for its French version, using the PHRASES list
// for fixed text and the PATTERNS list for text with values in it (dates, times, party sizes...).
// It watches the page, so text that the booking script adds later is translated too.
// Switching back restores the English. Form values (what gets booked) always stay in English.
// Gordon's panel translates itself (js/gordon-lang.js) and follows the same switch.

const I18N = (() => {
  let lang = 'en';
  try { if (localStorage.getItem('lang') === 'fr') lang = 'fr'; } catch (e) {}

  // ---------- fixed text: English -> French ----------
  const PHRASES = {
    // nav and shared
    'Menu': 'Menu', 'Hours & locations': 'Heures et adresses', 'Private events': 'Événements privés', 'Reserve': 'Réserver',
    'Close': 'Fermer', 'Edit': 'Modifier', 'Continue': 'Continuer',
    'Book by typing with Gordon': 'Réserver avec Gordon',
    'Ask Gordon for help': 'Demander de l’aide à Gordon',
    'Open Gordon, your assistant': 'Ouvrir Gordon, votre assistant',
    'Open Gordon, the booking assistant': "Ouvrir Gordon, l'assistant de réservation",
    // home (F01, F02)
    'Waffles with strawberries, whipped cream and maple syrup': 'Gaufres aux fraises, crème fouettée et sirop d’érable',
    'Brunch, Tuesday to Sunday, 9 am to 1:30 pm': 'Brunch du mardi au dimanche, de 9 h à 13 h 30',
    'Two locations, same waffles. Book a table for 1 to 8 people in under a minute.': 'Deux adresses, les mêmes gaufres. Réservez une table pour 1 à 8 personnes en moins d’une minute.',
    'Reserve a table': 'Réserver une table',
    'Walk-ins welcome at the bar.': 'Sans réservation? Bienvenue au bar.',
    'Tue to Sun 9 am to 1:30 pm, closed Mondays': 'Du mardi au dimanche, de 9 h à 13 h 30, fermé le lundi',
    'Groups of 9 or more: email groups@cravesandcrumble.com at least 48 hours ahead.': 'Groupes de 9 personnes ou plus : écrivez à groups@cravesandcrumble.com au moins 48 heures à l’avance.',
    'Which location?': 'Quelle adresse?',
    'Continue to booking': 'Continuer vers la réservation',
    // booking page (F03 to F09)
    'Dining room with bar stools and window tables': 'Salle à manger avec tabourets au bar et tables près des fenêtres',
    'Your booking so far': 'Votre réservation', 'Nothing chosen yet': 'Rien de choisi pour l’instant',
    'Book a table': 'Réserver une table', '1. When and how many': '1. Quand et combien',
    'Location': 'Adresse', 'Party size': 'Nombre de personnes', 'Date': 'Date', 'Time': 'Heure',
    'Fewer people': 'Moins de personnes', 'More people': 'Plus de personnes',
    'Open Tuesday to Sunday, 9 am to 1:30 pm. Closed Mondays.': 'Ouvert du mardi au dimanche, de 9 h à 13 h 30. Fermé le lundi.',
    'Book 1 to 8 guests online. For 9 or more, email': 'Réservez en ligne pour 1 à 8 personnes. Pour 9 ou plus, écrivez à',
    'at least 48 hours ahead.': 'au moins 48 heures à l’avance.',
    'Find a table': 'Trouver une table',
    'Choose a date.': 'Choisissez une date.',
    'That date has passed. Choose today or later.': 'Cette date est passée. Choisissez aujourd’hui ou plus tard.',
    "We're closed on Mondays. Choose Tuesday to Sunday.": 'Nous sommes fermés le lundi. Choisissez du mardi au dimanche.',
    "Today's brunch times have all passed. Choose another date.": 'Les heures de brunch d’aujourd’hui sont passées. Choisissez une autre date.',
    'Choose a time to search.': 'Choisissez une heure pour chercher.',
    'Choose a time': 'Choisir une heure',
    '2. Time': '2. Heure', 'Checking tables at': 'Recherche de tables à',
    'Crossed-out times are booked.': 'Les heures barrées sont complètes.',
    'Choose your table': 'Choisir votre table', 'See another day': 'Voir un autre jour',
    '3. Seating': '3. Place', '4. Dietary needs': '4. Restrictions alimentaires',
    'Optional, so the kitchen can prepare.': 'Facultatif, pour que la cuisine puisse se préparer.',
    'Anything else?': 'Autre chose?', 'Celebrating a birthday, high chair needed': 'Un anniversaire, une chaise haute pour bébé',
    'Skip this step': 'Passer cette étape', '5. Review and contact': '5. Vérification et coordonnées',
    'Seating': 'Place', 'Dietary needs': 'Restrictions alimentaires', 'None': 'Aucune',
    "Who's the booking for?": 'Au nom de qui est la réservation?', 'Full name': 'Nom complet', 'Mobile number': 'Numéro de cellulaire',
    'Enter the name for the booking': 'Entrez le nom pour la réservation',
    'Enter a 10-digit number, like 905-555-0100': 'Entrez un numéro à 10 chiffres, par exemple 905-555-0100',
    'Email for confirmation (optional)': 'Courriel de confirmation (facultatif)',
    'An 18% gratuity is added for parties of 6 or more.': 'Des frais de service de 18 % s’appliquent aux groupes de 6 personnes ou plus.',
    'Gratuity is at your discretion.': 'Le pourboire est à votre discrétion.',
    'Confirm booking': 'Confirmer la réservation',
    // floor plan (F07)
    'All': 'Toutes', 'Low tables': 'Tables basses', 'High-tops': 'Tables hautes', 'Windows': 'Fenêtres', 'Bar': 'Bar',
    'Kitchen pass': 'Passe de la cuisine', 'Entrance': 'Entrée', 'Taken': 'Prise', 'Book this table': 'Réserver cette table',
    // confirmation (F10)
    'Brunch table with poached eggs, grain bowls and coffee': 'Table de brunch avec œufs pochés, bols de céréales et café',
    'Reservation confirmed': 'Réservation confirmée', 'Add to calendar': 'Ajouter au calendrier', 'Get directions': 'Itinéraire',
    'Need to change or cancel? Please let us know at least 4 hours ahead by calling': 'Pour modifier ou annuler, prévenez-nous au moins 4 heures à l’avance en appelant le',
    '. Tables are held for 15 minutes past your booking time, then released to walk-in guests.': '. Les tables sont gardées 15 minutes après l’heure prévue, puis offertes aux clients sans réservation.',
    // page titles
    'Reserve · Craves & Crumble': 'Réserver · Craves & Crumble', 'Booked · Craves & Crumble': 'Réservé · Craves & Crumble',
  };

  // ---------- text with values in it ----------
  const DAY = { Sun: 'dimanche', Mon: 'lundi', Tue: 'mardi', Wed: 'mercredi', Thu: 'jeudi', Fri: 'vendredi', Sat: 'samedi' };
  const MON = { Jan: 'janvier', Feb: 'février', Mar: 'mars', Apr: 'avril', May: 'mai', Jun: 'juin', Jul: 'juillet', Aug: 'août',
    Sep: 'septembre', Oct: 'octobre', Nov: 'novembre', Dec: 'décembre' };
  const WHERE = { 'by the windows': 'près des fenêtres', 'at the bar': 'au bar', 'in the middle': 'au centre', 'near the bar': 'près du bar',
    'by the entrance': 'près de l’entrée', 'near the kitchen': 'près de la cuisine', 'by the kitchen, long': 'longue, près de la cuisine' };
  const DIET = { 'Nut allergy': 'Allergie aux noix', 'Gluten-free': 'Sans gluten', 'Dairy-free': 'Sans produits laitiers',
    'Vegetarian': 'Végétarien', 'Shellfish allergy': 'Allergie aux fruits de mer' };
  const people = (n) => `${n} personne${Number(n) > 1 ? 's' : ''}`;
  const height = (h) => (/high/i.test(h) ? 'table haute' : 'table basse');
  const PATTERNS = [
    // whole sentences first
    [/^(.+) is fully booked\. The closest times are:$/, (m, t) => `${t} est complet. Les heures les plus proches sont :`],
    [/^(.+) is fully booked and there are no other times that day\.$/, (m, t) => `${t} est complet et il n’y a pas d’autres heures ce jour-là.`],
    [/^We're fully booked at (.+) on (.+)\.$/, (m, l, d) => `Nous sommes complets à ${l} le ${d}.`],
    [/^Try (.+)$/, (m, d) => `Essayer ${d}`],
    [/^Check (\w+) instead$/, (m, l) => `Voir plutôt ${l}`],
    [/^Book table (\d+)$/, (m, n) => `Réserver la table ${n}`],
    [/^No table picked yet\. Faded tables don't fit a party of (\d+)\.$/, (m, n) => `Aucune table choisie. Les tables pâles ne conviennent pas à un groupe de ${people(n)}.`],
    [/^Reservation confirmed, (.+)\.$/, (m, n) => `Réservation confirmée, ${n}.`],
    [/^Confirmation #(\d+)\. We've texted it to (.+)\.$/, (m, c, p) => `Confirmation no ${c}. Nous l’avons envoyée par texto au ${p}.`],
    [/^Get directions to (.+)$/, (m, a) => `Itinéraire vers ${a}`],
    [/^(\d+) (Low|High)$/, (m, n, h) => `${n} ${h === 'High' ? 'Haute' : 'Basse'}`],
    // pieces inside longer text
    [/Tue to Sun 9 am to 1:30 pm/g, () => 'du mardi au dimanche, de 9 h à 13 h 30'],
    [/No preference, any (low table|high-top)/g, (m, h) => `Pas de préférence, n’importe quelle ${height(h)}`],
    [/No preference/g, () => 'Pas de préférence'],
    [/Table (\d+), (high-top|low table) ([a-z ,]+?), seats (\d+) to (\d+)/g, (m, n, h, w, a, b) => `Table ${n}, ${height(h)} ${WHERE[w] || w}, ${a} à ${b} places`],
    [/, taken\b/g, () => ', prise'], [/, too small for your party/g, () => ', trop petite pour votre groupe'],
    [/, too big for your party/g, () => ', trop grande pour votre groupe'],
    [/\b[Pp]arty of (\d+)/g, (m, n) => people(n)],
    [/\b(Sun|Mon|Tue|Wed|Thu|Fri|Sat), (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2})\b/g, (m, d, mo, n) => `${DAY[d]} ${n} ${MON[mo]}`],
    [/\b(\d{1,2}):(\d{2}) (am|pm)\b/g, (m, h, mi, ap) => `${(Number(h) % 12) + (ap === 'pm' ? 12 : 0)} h${mi === '00' ? '' : ' ' + mi}`],
    [/Nut allergy|Gluten-free|Dairy-free|Vegetarian|Shellfish allergy/g, (m) => DIET[m]],
  ];

  function translate(en) {
    const key = en.trim();
    if (!key) return en;
    if (PHRASES[key] !== undefined) return en.replace(key, PHRASES[key]);
    let out = en;
    for (const [re, fn] of PATTERNS) out = out.replace(re, fn);
    return out;
  }

  // ---------- applying it to the page ----------
  const nodes = new WeakMap();   // text node -> { en, shown }
  const attrs = new WeakMap();   // element -> { attr: { en, shown } }
  const ATTRS = ['alt', 'placeholder', 'aria-label', 'title'];
  const skip = (el) => el && el.closest && el.closest('#gordon-panel, script, style, [data-no-translate], textarea');

  function doText(node) {
    if (skip(node.parentElement)) return;
    const cur = node.nodeValue;
    const st = nodes.get(node);
    const en = st && cur === st.shown ? st.en : cur;       // the page changed it: that's new English
    const shown = lang === 'fr' ? translate(en) : en;
    nodes.set(node, { en, shown });
    if (shown !== cur) node.nodeValue = shown;
  }
  function doAttrs(el) {
    if (skip(el)) return;
    let rec = attrs.get(el);
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue;
      if (!rec) { rec = {}; attrs.set(el, rec); }
      const cur = el.getAttribute(a);
      const st = rec[a];
      const en = st && cur === st.shown ? st.en : cur;
      const shown = lang === 'fr' ? translate(en) : en;
      rec[a] = { en, shown };
      if (shown !== cur) el.setAttribute(a, shown);
    }
  }
  function walk(root) {
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType !== 1) return;
    doAttrs(root);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let n;
    while ((n = tw.nextNode())) (n.nodeType === 3 ? doText(n) : doAttrs(n));
  }
  let titleEn = document.title;
  function apply() {
    document.documentElement.lang = lang;
    walk(document.body);
    document.title = lang === 'fr' ? translate(titleEn) : titleEn;
    const btn = document.getElementById('lang-toggle');
    if (btn) {
      btn.textContent = lang === 'fr' ? 'English' : 'Français';
      btn.lang = lang === 'fr' ? 'en' : 'fr';
      btn.setAttribute('aria-label', lang === 'fr' ? 'Switch the site to English' : 'Passer le site en français');
    }
  }
  new MutationObserver(list => {
    for (const m of list) {
      if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') doAttrs(m.target);
      else m.addedNodes.forEach(walk);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });

  function set(l) {
    lang = l === 'fr' ? 'fr' : 'en';
    try { localStorage.setItem('lang', lang); } catch (e) {}
    apply();
    window.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
  }

  // The switch, in the nav of every page (before Reserve, so it stays visible on phones)
  const nav = document.querySelector('.nav');
  if (nav) {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.id = 'lang-toggle'; btn.className = 'link-btn lang-toggle';
    btn.addEventListener('click', () => set(lang === 'fr' ? 'en' : 'fr'));
    nav.insertBefore(btn, nav.querySelector('.btn-primary'));
  }
  apply();

  return { get lang() { return lang; }, set, translate };
})();
