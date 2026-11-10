// Gordon's languages (R-19): English by default, French as an option.
// - GordonLang.t.<key>(...) gives each of Gordon's lines in the current language.
// - GordonLang.toEnglish(text) turns a French reply into the English words the parser knows,
//   so one parser (js/gordon-parser.js) serves both languages.
// The booking form itself stays in English; only Gordon switches.

const GordonLang = (() => {
  let lang = 'en';

  // ---------- formatting ----------
  const DIET_FR = { 'Nut allergy': 'allergie aux noix', 'Gluten-free': 'sans gluten', 'Dairy-free': 'sans produits laitiers',
    'Vegetarian': 'végétarien', 'Shellfish allergy': 'allergie aux fruits de mer' };
  function date(iso) {
    const d = new Date(iso + 'T12:00:00');
    return lang === 'fr'
      ? d.toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' })
      : d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  function time(t) { // '1:30 pm' -> '13 h 30' in French
    if (lang !== 'fr' || !t) return t;
    const [, h, m, ap] = t.match(/(\d+):(\d+) (am|pm)/);
    const hh = (Number(h) % 12) + (ap === 'pm' ? 12 : 0);
    return `${hh} h${m === '00' ? '' : ' ' + m}`;
  }
  const times = (list) => list.map(time);
  const diet = (items) => (lang === 'fr' ? items.map(i => DIET_FR[i] || i) : items);
  const or = (list) => list.join(lang === 'fr' ? ' ou ' : ' or ');
  const and = (list) => list.join(lang === 'fr' ? ' et ' : ' and ');
  const seat = (table) => {
    if (lang !== 'fr') return table.replace('No preference, any ', '').replace('No preference', 'no seating preference');
    if (/high-top/.test(table) && /No preference/.test(table)) return 'une table haute';
    if (/low table/.test(table) && /No preference/.test(table)) return 'une table basse';
    if (table === 'No preference') return 'sans préférence de table';
    const m = table.match(/^Table (\d+), (high-top|low table)/);
    return m ? `la table ${m[1]} (${m[2] === 'high-top' ? 'haute' : 'basse'})` : table;
  };

  // ---------- Gordon's lines ----------
  const EN = {
    ui: { close: 'Close', soundOn: 'Sound on', soundOff: 'Sound off', talk: 'Talk', stop: 'Stop', send: 'Send', other: 'Français', otherLang: 'fr',
      placeholder: 'Type here, for example: 4 people Sunday at 11', label: 'Message Gordon', log: 'Conversation with Gordon',
      note: 'Gordon fills in the form as you go. You can edit any field yourself.', you: 'You', youSpeaking: 'You (speaking)', type: 'Type' },
    greet: (loc) => `Hi, I'm Gordon. I can book your table at ${loc}. Would you like to talk or type? Either way, tell me how many people, which day and what time, for example "4 people this Sunday at 11". Say "Toronto" or "Oshawa" to switch location. Pour le français, appuyez sur Français.`,
    switched: () => "Sure, let's continue in English.",
    noVoice: 'Voice works in Chrome and Edge. In this browser you can type to me.',
    toForm: "No problem. Everything I've filled in stays in the form, so you can finish it yourself.",
    booking: 'Booking it now.',
    location: (l) => `Switched to ${l}.`,
    tooMany: (max, email) => `Online bookings are for up to ${max} people. For ${max + 1} or more, please email ${email} at least 48 hours ahead, and we'll seat you at our semi-private long table. Parties of 6 or more have an 18% gratuity added. Would you like to book for ${max} or fewer instead?`,
    howMany: 'How many people will there be?',
    party: (n, changed) => (changed ? `Changed the party size to ${n}.` : `Party of ${n}.`),
    gratuity: () => 'An 18% gratuity is added for parties of 6 or more.',
    noDate: "That date doesn't exist. Which day would you like?",
    pastDate: 'That date has already passed. Which day would you like?',
    closed: "We're closed on Mondays. Would another day work, Tuesday to Sunday?",
    brunchOver: (d) => `Brunch is over for ${d}. Would another day work?`,
    date: (d, changed) => (changed ? `Changed the date to ${d}.` : `${d}.`),
    timeGone: 'That time has passed on that day.',
    outside: (t) => `We serve brunch from 9 am to 1:30 pm, so ${t} won't work. What time in that window suits you?`,
    half: (list) => `We book on the half hour. Would ${or(list)} work?`,
    timePast: (t) => `${t} has already passed today. Would a later time or another day work?`,
    time: (t, changed) => (changed ? `Changed the time to ${t}.` : `${t}.`),
    seat: { none: 'No seating preference.', High: 'A high-top.', Low: 'A low table.' },
    dietNoted: (items) => `I've noted: ${items.join(', ')}.`,
    dietNone: 'No dietary needs.',
    dietNote: (t) => `I've added a note for the kitchen: "${t}".`,
    name: (n) => `Booking under ${n}.`,
    phone: (p) => `Mobile ${p}.`,
    phoneShort: 'That number looks too short. Please type a 10-digit mobile number, like 905-555-0100.',
    lost: "Sorry, I'm still not getting it. You can keep typing, or fill in the form on the left. Everything I've done so far stays there.",
    lostChips: ['Use the form', 'Keep typing'],
    notCaught: (q) => `Sorry, I didn't catch that. ${q}`,
    fullyBooked: (loc, d, next) => `We're fully booked at ${loc} on ${d}. The next day with tables is ${next}. Would that work?`,
    full: (t, list) => `${t} is fully booked. The closest times are ${and(list)}. Which would you like?`,
    fullNone: (t) => `${t} is fully booked and there are no other times that day. Would another day work?`,
    free: (t, d) => `Good news, ${t} on ${d} is free.`,
    askChange: 'What would you like to change? For example "make it 5 people" or "Saturday at 10".',
    askParty: 'How many people, including you?',
    askDate: 'Which day would you like? We are open Tuesday to Sunday.',
    askTimeOffers: (list) => `Which time would you like, ${or(list)}?`,
    askTime: 'What time? Brunch bookings run from 9 am to 1:30 pm, on the half hour.',
    askSeating: 'Would you like a low table or a high-top?',
    seatChips: ['Low table', 'High-top', 'No preference'],
    askDiet: 'Any allergies or dietary needs I should tell the kitchen?',
    dietChips: ['None', 'Nut allergy', 'Gluten-free', 'Dairy-free', 'Vegetarian', 'Shellfish allergy'],
    askName: 'What name should the booking be under?',
    askPhone: 'And a mobile number for the confirmation text?',
    readback: (b) => `Here's your booking: ${b.loc}, ${b.date} at ${b.time}, party of ${b.party}, ${b.seat}, ${b.diet || 'no dietary needs'}, under ${b.name}, mobile ${b.phone}. ${b.party >= 6 ? 'An 18% gratuity is added for parties of 6 or more. ' : ''}Shall I book it?`,
    confirmChips: ['Yes, book it', 'Change something'],
    micWhy: 'I need your microphone to hear you, so your browser will ask for permission. I only listen while the Talk button says Stop.',
    ready: 'Getting voice ready...',
    listening: 'Listening... speak now.',
    noSpeech: "I didn't hear anything. Press Talk to try again, or type.",
    denied: "I can't use the microphone, but I can still help if you type. Your answers so far are kept.",
    noMic: "I can't find a microphone. You can type to me instead.",
    glitch: 'Voice stopped working for a moment. Press Talk to try again, or type.',
    pressTalk: 'Press Talk when you are ready, or type.',
  };

  const FR = {
    ui: { close: 'Fermer', soundOn: 'Son activé', soundOff: 'Son coupé', talk: 'Parler', stop: 'Arrêter', send: 'Envoyer', other: 'English', otherLang: 'en',
      placeholder: 'Écrivez ici, par exemple : 4 personnes dimanche à 11 h', label: 'Message à Gordon', log: 'Conversation avec Gordon',
      note: 'Gordon remplit le formulaire au fur et à mesure. Vous pouvez modifier chaque champ vous-même.', you: 'Vous', youSpeaking: 'Vous (en train de parler)', type: 'Écrire' },
    greet: (loc) => `Bonjour, je suis Gordon. Je peux réserver votre table à ${loc}. Voulez-vous parler ou écrire? Dites-moi le nombre de personnes, le jour et l'heure, par exemple « 4 personnes dimanche à 11 h ». Dites « Toronto » ou « Oshawa » pour changer d'adresse.`,
    switched: () => "D'accord, continuons en français.",
    noVoice: 'La voix fonctionne dans Chrome et Edge. Dans ce navigateur, vous pouvez m’écrire.',
    toForm: 'Aucun problème. Tout ce que j’ai rempli reste dans le formulaire, vous pouvez le terminer vous-même.',
    booking: 'Je réserve maintenant.',
    location: (l) => `C'est noté, à ${l}.`,
    tooMany: (max, email) => `Les réservations en ligne sont pour ${max} personnes au maximum. Pour ${max + 1} personnes ou plus, écrivez à ${email} au moins 48 heures à l'avance, et nous vous installerons à notre grande table semi-privée. Des frais de service de 18 % s'appliquent aux groupes de 6 ou plus. Voulez-vous réserver pour ${max} personnes ou moins?`,
    howMany: 'Combien de personnes serez-vous?',
    party: (n, changed) => (changed ? `J'ai changé pour ${n} personne${n > 1 ? 's' : ''}.` : `${n} personne${n > 1 ? 's' : ''}.`),
    gratuity: () => 'Des frais de service de 18 % s’appliquent aux groupes de 6 personnes ou plus.',
    noDate: "Cette date n'existe pas. Quel jour voulez-vous?",
    pastDate: 'Cette date est déjà passée. Quel jour voulez-vous?',
    closed: 'Nous sommes fermés le lundi. Un autre jour, du mardi au dimanche?',
    brunchOver: (d) => `Le brunch est terminé pour ${d}. Un autre jour vous conviendrait?`,
    date: (d, changed) => (changed ? `J'ai changé la date pour ${d}.` : `${d[0].toUpperCase() + d.slice(1)}.`),
    timeGone: 'Cette heure est déjà passée ce jour-là.',
    outside: (t) => `Le brunch est servi de 9 h à 13 h 30, donc ${t} ne fonctionne pas. Quelle heure dans cette plage vous convient?`,
    half: (list) => `Nous réservons aux demi-heures. ${or(list)}, ça vous va?`,
    timePast: (t) => `${t} est déjà passé aujourd'hui. Une heure plus tard ou un autre jour?`,
    time: (t, changed) => (changed ? `J'ai changé l'heure pour ${t}.` : `À ${t}.`),
    seat: { none: 'Pas de préférence de table.', High: 'Une table haute.', Low: 'Une table basse.' },
    dietNoted: (items) => `C'est noté : ${diet(items).join(', ')}.`,
    dietNone: 'Aucune restriction alimentaire.',
    dietNote: (t) => `J'ai ajouté une note pour la cuisine : « ${t} ».`,
    name: (n) => `Réservation au nom de ${n}.`,
    phone: (p) => `Cellulaire ${p}.`,
    phoneShort: 'Ce numéro semble trop court. Entrez un numéro de cellulaire à 10 chiffres, par exemple 905-555-0100.',
    lost: "Désolé, je ne comprends toujours pas. Vous pouvez continuer à écrire, ou remplir le formulaire à gauche. Tout ce que j'ai fait y reste.",
    lostChips: ['Utiliser le formulaire', 'Continuer'],
    notCaught: (q) => `Désolé, je n'ai pas compris. ${q}`,
    fullyBooked: (loc, d, next) => `Nous sommes complets à ${loc} le ${d}. Le prochain jour avec des tables libres est le ${next}. Ça vous convient?`,
    full: (t, list) => `${t} est complet. Les heures les plus proches sont ${and(list)}. Laquelle préférez-vous?`,
    fullNone: (t) => `${t} est complet et il n'y a plus d'autres heures ce jour-là. Un autre jour vous conviendrait?`,
    free: (t, d) => `Bonne nouvelle, ${t} le ${d} est libre.`,
    askChange: 'Que voulez-vous changer? Par exemple « 5 personnes » ou « samedi à 10 h ».',
    askParty: 'Pour combien de personnes, vous compris?',
    askDate: 'Quel jour voulez-vous? Nous sommes ouverts du mardi au dimanche.',
    askTimeOffers: (list) => `Quelle heure préférez-vous, ${or(list)}?`,
    askTime: 'À quelle heure? Les réservations de brunch vont de 9 h à 13 h 30, aux demi-heures.',
    askSeating: 'Préférez-vous une table basse ou une table haute?',
    seatChips: ['Table basse', 'Table haute', 'Pas de préférence'],
    askDiet: 'Des allergies ou des restrictions alimentaires à signaler à la cuisine?',
    dietChips: ['Aucune', 'Allergie aux noix', 'Sans gluten', 'Sans produits laitiers', 'Végétarien', 'Allergie aux fruits de mer'],
    askName: 'À quel nom dois-je faire la réservation?',
    askPhone: 'Et un numéro de cellulaire pour le texto de confirmation?',
    readback: (b) => `Voici votre réservation : ${b.loc}, ${b.date} à ${b.time}, ${b.party} personne${b.party > 1 ? 's' : ''}, ${b.seat}, ${b.diet || 'aucune restriction alimentaire'}, au nom de ${b.name}, cellulaire ${b.phone}. ${b.party >= 6 ? 'Des frais de service de 18 % s’appliquent aux groupes de 6 ou plus. ' : ''}Je confirme la réservation?`,
    confirmChips: ['Oui, réservez', 'Changer quelque chose'],
    micWhy: "J'ai besoin de votre microphone pour vous entendre, votre navigateur va donc demander la permission. J'écoute seulement quand le bouton Parler indique Arrêter.",
    ready: 'Préparation de la voix...',
    listening: 'Je vous écoute... parlez maintenant.',
    noSpeech: "Je n'ai rien entendu. Appuyez sur Parler pour réessayer, ou écrivez.",
    denied: "Je ne peux pas utiliser le microphone, mais je peux vous aider par écrit. Vos réponses sont conservées.",
    noMic: 'Je ne trouve pas de microphone. Vous pouvez m’écrire.',
    glitch: 'La voix a cessé de fonctionner un instant. Appuyez sur Parler pour réessayer, ou écrivez.',
    pressTalk: 'Appuyez sur Parler quand vous êtes prêt, ou écrivez.',
  };

  // ---------- French replies -> words the parser knows ----------
  const NUM_FR = { un: 'one', une: 'one', deux: 'two', trois: 'three', quatre: 'four', cinq: 'five', six: 'six', sept: 'seven',
    huit: 'eight', neuf: 'nine', dix: 'ten', onze: 'eleven', douze: 'twelve', quinze: 'fifteen', vingt: 'twenty' };
  const DAYS_FR = { dimanche: 'sunday', lundi: 'monday', mardi: 'tuesday', mercredi: 'wednesday', jeudi: 'thursday', vendredi: 'friday', samedi: 'saturday' };
  const MONTHS_FR = { janvier: 'january', 'f[ée]vrier': 'february', mars: 'march', avril: 'april', mai: 'may', juin: 'june', juillet: 'july',
    'ao[uû]t': 'august', septembre: 'september', octobre: 'october', novembre: 'november', 'd[ée]cembre': 'december' };

  function toEnglish(raw) {
    let t = ' ' + raw.toLowerCase().replace(/[’]/g, "'").replace(/[,;!?«»]|\.(?=\s|$)/g, ' ') + ' ';
    const r = (re, to) => { t = t.replace(re, to); };
    // names first, so they keep their accents
    r(/\b(?:je m'appelle|mon nom est|c'est au nom de|au nom de)\s+/, ' my name is ');
    r(/^\s*(?:c'est|moi c'est)\s+/, " it's ");
    // leaving Gordon / changing something
    r(/\b(utiliser le formulaire|je vais le faire moi-m[eê]me|laisse[rz]? tomber|annuler|fermer|arr[eê]te[rz]?)\b/, ' use the form ');
    r(/\b(changer|modifier|corriger|erreur)\b/, ' change ');
    // yes / no / none
    r(/^\s*(oui|ouais|d'accord|bien s[uû]r|parfait|ok|c'est [cç]a|exact|r[ée]servez|confirmez|allez-y)\b/, ' yes ');
    r(/^\s*(non|nan|pas vraiment)\b/, ' no ');
    r(/\b(aucune?|rien|pas d'allergies?|pas de restrictions?|aucune restriction)\b/, ' none ');
    // seating
    r(/\b(tables? hautes?|tabourets?|au comptoir|au bar)\b/, ' high-top ');
    r(/\b(tables? basses?|table normale|table r[ée]guli[eè]re|fauteuil roulant|accessible)\b/, ' low table ');
    r(/\b(pas de pr[ée]f[ée]rence|peu importe|n'importe laquelle|n'importe|[cç]a m'est [ée]gal|l'une ou l'autre)\b/, ' no preference ');
    r(/\bbasses?\b/, ' low '); r(/\bhautes?\b/, ' high ');
    // dietary needs
    r(/\b(noix|arachides?|cacahu[eè]tes?)\b/, ' nuts '); r(/\bc(oe|œ)liaque\b/, ' celiac ');
    r(/\b(produits laitiers|lactose|lait)\b/, ' dairy '); r(/\bv[ée]g[ée]talien(ne)?\b/, ' vegan ');
    r(/\bv[ée]g[ée]tarien(ne)?s?\b/, ' vegetarian '); r(/\b(fruits de mer|crustac[ée]s|crevettes|homard|crabe)\b/, ' shellfish ');
    // times: 11 h 30, 11h, midi, vers
    r(/\b(\d{1,2})\s*h\s*(\d{2})\b/g, ' $1:$2 '); r(/\b(\d{1,2})\s*h\b/g, ' $1:00 ');
    r(/\bmidi\b/, ' noon '); r(/\bvers\b/g, ' around '); r(/(^|\s)[àa](?=\s)/g, ' at ');
    r(/\bet demie\b/, ':30');
    // dates
    r(/\baujourd'hui\b/, ' today '); r(/\bapr[eè]s-demain\b/, ' day after tomorrow '); r(/\bdemain\b/, ' tomorrow ');
    for (const [fr, en] of Object.entries(DAYS_FR)) t = t.replace(new RegExp(`\\b${fr}( prochain)?\\b`, 'g'), ` ${en} `);
    for (const [fr, en] of Object.entries(MONTHS_FR)) t = t.replace(new RegExp(`\\b${fr}\\b`, 'g'), ` ${en} `);
    r(/\b1er\b/, '1st'); r(/\b(le|du)\s+(\d{1,2})\s+(?=[a-z])/g, ' the $2th ');
    // party size
    r(/\b(juste moi|seulement moi|seule?|moi seule?)\b/, ' just me ');
    r(/\bmoi et (ma femme|mon mari|mon ami|mon amie|ma copine|mon copain|mon partenaire|ma partenaire|ma m[eè]re|mon p[eè]re|ma s(oe|œ)ur|mon fr[eè]re)\b/, ' me and my friend ');
    r(/\bmoi et (\S+) (ami|amie|amis|amies|personnes|autres|coll[eè]gues|enfants)\b/, ' me and $1 friends ');
    r(/\b(en fait|plut[oô]t|finalement|mettez|mets)\b/g, ' actually ');
    r(/\b(nous sommes|on est|on sera|nous serons)\s+(\S+)/, ' $2 people ');
    r(/\b(personnes?|gens|convives|adultes)\b/g, ' people ');
    r(/\bpour\b/g, ' for ');
    for (const [fr, en] of Object.entries(NUM_FR)) t = t.replace(new RegExp(`\\b${fr}\\b(?!-)`, 'g'), en);
    return t.replace(/\s+/g, ' ').trim();
  }

  return {
    get lang() { return lang; },
    set(l) { lang = l === 'fr' ? 'fr' : 'en'; },
    get t() { return lang === 'fr' ? FR : EN; },
    speechLang: () => (lang === 'fr' ? 'fr-CA' : 'en-US'),
    date, time, times, diet, seat, toEnglish,
  };
})();

if (typeof module !== 'undefined') module.exports = GordonLang;
