// Gordon the waffle: an original round waffle character built from simple three.js shapes.
// No model file to download. Eyes, eyebrows, mustache, mouth, chef hat and two legs.
//
// Use: const g = createWaffle(THREE); scene.add(g.object); then each frame g.update(dt).
//   g.setTalking(true/false)   mouth moves while he speaks
//   g.setMood(name, ms)        'happy' (default), 'listening', 'thinking', 'sorry', 'surprised', 'excited'
//                              ms = how long before he goes back to happy (0 = keep it)
//   g.nod(), g.hop(), g.celebrate()   one-off moves
//   g.lookAt(x, y)             -1..1, where his eyes look (null = look around by himself)
//   g.setReducedMotion(true)   no hops or bouncing, only face changes
// The waffle faces +Z. Feet stand on y = FLOOR.

export function createWaffle(THREE) {
  const COL = {
    waffle: 0xdba04a, pocket: 0xb8732c, rim: 0xc98838,
    hair: 0x3a2416, eyeWhite: 0xffffff, pupil: 0x1e130c, mouth: 0x5a1a1e, tongue: 0xd96b6b,
    blush: 0xe07a6a, hat: 0xffffff, shoe: 0xfaf6ee, sole: 0x7a1f2b,
  };
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...extra });
  const M = {
    waffle: mat(COL.waffle), pocket: mat(COL.pocket, { roughness: 0.9 }), rim: mat(COL.rim),
    hair: mat(COL.hair, { roughness: 0.95 }), white: mat(COL.eyeWhite, { roughness: 0.3 }),
    pupil: mat(COL.pupil, { roughness: 0.2 }), shine: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    mouth: mat(COL.mouth, { roughness: 0.6 }), tongue: mat(COL.tongue), hat: mat(COL.hat, { roughness: 0.85 }),
    shoe: mat(COL.shoe, { roughness: 0.6 }), sole: mat(COL.sole),
    blush: new THREE.MeshBasicMaterial({ color: COL.blush, transparent: true, opacity: 0, depthWrite: false }),
    shadow: new THREE.MeshBasicMaterial({ color: 0x4a1418, transparent: true, opacity: 0.18, depthWrite: false }),
  };
  const mesh = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); return o; };

  const R = 1, T = 0.3;            // waffle radius and thickness
  const L = 0.36;                  // thigh and shin length
  const HIP_Y = -R + 0.1;
  const FLOOR = HIP_Y - 2 * L - 0.08;

  const root = new THREE.Group();  // whole character
  const body = new THREE.Group();  // waffle, face and hat (moves on top of the legs)
  root.add(body);

  // ---------- waffle ----------
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(R, R, T, 72), [M.rim, M.pocket, M.pocket]);
  disc.rotation.x = Math.PI / 2;
  body.add(disc);
  [1, -1].forEach(side => {
    const rim = mesh(new THREE.TorusGeometry(R - 0.05, 0.075, 12, 72), M.waffle, 0, 0, side * T / 2);
    body.add(rim);
    // the grid of ridges that makes the square pockets
    const step = 0.27;
    for (let i = -3; i <= 3; i++) {
      const o = i * step, half = Math.sqrt(R * R - o * o) - 0.07;
      if (half <= 0) continue;
      const h = mesh(new THREE.BoxGeometry(half * 2, 0.08, 0.12), M.waffle, 0, o, side * T / 2);
      const v = mesh(new THREE.BoxGeometry(0.08, half * 2, 0.12), M.waffle, o, 0, side * T / 2);
      body.add(h, v);
    }
  });
  const FRONT = T / 2 + 0.06;      // front of the ridges; the face sits on top of this

  // ---------- face ----------
  const face = new THREE.Group();
  face.position.z = FRONT;
  body.add(face);

  function makeEye(x) {
    const g = new THREE.Group(); g.position.set(x, 0.3, 0.02);
    const white = mesh(new THREE.SphereGeometry(0.22, 24, 16), M.white); white.scale.z = 0.55;
    const pupils = new THREE.Group(); pupils.position.z = 0.1;
    const pupil = mesh(new THREE.SphereGeometry(0.1, 20, 12), M.pupil); pupil.scale.z = 0.5;
    const shine = mesh(new THREE.SphereGeometry(0.03, 10, 8), M.shine, 0.035, 0.04, 0.05);
    pupils.add(pupil, shine);
    g.add(white, pupils);
    face.add(g);
    // closed happy eye (an upside-down U), shown instead when he beams
    const arc = mesh(new THREE.TorusGeometry(0.14, 0.035, 8, 24, Math.PI), M.pupil, x, 0.26, 0.1);
    arc.visible = false; face.add(arc);
    return { g, pupils, arc };
  }
  const eyes = [makeEye(-0.33), makeEye(0.33)];

  function makeBrow(x) {
    const b = mesh(new THREE.CapsuleGeometry(0.05, 0.24, 4, 10), M.hair, x, 0.6, 0.06);
    b.rotation.z = Math.PI / 2;
    const pivot = new THREE.Group(); pivot.add(b); face.add(pivot);
    return { pivot, b, side: Math.sign(x) };
  }
  const brows = [makeBrow(-0.33), makeBrow(0.33)];

  // big bushy mustache, curled up at the ends (one half, mirrored)
  const stache = new THREE.Group(); stache.position.set(0, -0.06, 0.08); face.add(stache);
  const stacheHalves = [-1, 1].map(side => {
    const half = new THREE.Group(); half.scale.x = side; stache.add(half);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.0, 0.0, 0.02), new THREE.Vector3(0.14, -0.03, 0.03), new THREE.Vector3(0.3, -0.07, 0.02),
      new THREE.Vector3(0.44, -0.04, 0), new THREE.Vector3(0.53, 0.05, -0.01), new THREE.Vector3(0.5, 0.14, -0.02),
      new THREE.Vector3(0.43, 0.15, -0.02)]);
    const n = 22;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), p = curve.getPoint(t);
      const r = 0.115 * (1 - t) + 0.03 * t;
      half.add(mesh(new THREE.SphereGeometry(r, 14, 10), M.hair, p.x, p.y, p.z));
    }
    return half;
  });

  // mouth: a dark oval that opens, a smile line when closed
  const mouth = new THREE.Group(); mouth.position.set(0, -0.36, 0); face.add(mouth);
  const mouthHole = mesh(new THREE.SphereGeometry(0.17, 20, 12), M.mouth); mouthHole.scale.set(1, 0.05, 0.35);
  const tongue = mesh(new THREE.SphereGeometry(0.07, 14, 10), M.tongue, 0, -0.05, 0.02); tongue.scale.set(1, 0.6, 0.5);
  mouthHole.add(tongue);
  const smile = mesh(new THREE.TorusGeometry(0.14, 0.026, 8, 28, Math.PI), M.mouth, 0, 0.02, 0.02);
  mouth.add(mouthHole, smile);

  const cheeks = [-0.62, 0.62].map(x => {
    const c = mesh(new THREE.CircleGeometry(0.11, 24), M.blush, x, 0.02, 0.07); c.scale.y = 0.6; face.add(c); return c;
  });

  // ---------- chef hat ----------
  const hat = new THREE.Group(); hat.position.set(0.18, R - 0.06, 0); hat.rotation.z = -0.22; body.add(hat);
  hat.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.22, 32), M.hat, 0, 0.1, 0));
  [[0, 0.36, 0, 0.28], [-0.2, 0.3, 0, 0.2], [0.2, 0.3, 0, 0.2], [0, 0.3, 0.14, 0.2], [0, 0.3, -0.14, 0.2]]
    .forEach(([x, y, z, r]) => hat.add(mesh(new THREE.SphereGeometry(r, 20, 14), M.hat, x, y, z)));

  // ---------- legs ----------
  function makeLeg(x) {
    const hip = new THREE.Group(); hip.position.set(x, HIP_Y, 0);
    const thigh = mesh(new THREE.CylinderGeometry(0.045, 0.045, L, 10), M.hair, 0, -L / 2, 0);
    const knee = new THREE.Group(); knee.position.y = -L;
    const shin = mesh(new THREE.CylinderGeometry(0.045, 0.04, L, 10), M.hair, 0, -L / 2, 0);
    const kneeBall = mesh(new THREE.SphereGeometry(0.05, 10, 8), M.hair);
    const ankle = new THREE.Group(); ankle.position.y = -L;
    const shoe = mesh(new THREE.SphereGeometry(0.1, 18, 12), M.shoe, 0, -0.02, 0.07); shoe.scale.set(1.2, 0.75, 1.9);
    const sole = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.035, 18), M.sole, 0, -0.065, 0.07); sole.scale.set(1, 1, 1.6);
    ankle.add(shoe, sole);
    knee.add(shin, kneeBall, ankle);
    hip.add(thigh, knee);
    root.add(hip);
    return { hip, knee, ankle };
  }
  const legs = [makeLeg(-0.3), makeLeg(0.3)];

  const shadow = mesh(new THREE.CircleGeometry(0.75, 32), M.shadow, 0, FLOOR - 0.09, 0);
  shadow.rotation.x = -Math.PI / 2; shadow.scale.y = 0.5;
  root.add(shadow);

  // ---------- expressions ----------
  // brow: lift and tilt (+ = inner ends up, worried), eye: open (1 normal), wide, mouth: curve (+ smile, - frown)
  const MOODS = {
    happy:     { browY: 0,     browTilt: -0.05, eyeOpen: 1,    eyeWide: 1,    curve: 1,    blush: 0.35, tilt: 0,     lean: 0,     droop: 0 },
    listening: { browY: 0.06,  browTilt: 0.05,  eyeOpen: 1.08, eyeWide: 1.08, curve: 0.6,  blush: 0.2,  tilt: 0.12,  lean: 0.12,  droop: 0 },
    thinking:  { browY: 0.03,  browTilt: 0,     eyeOpen: 0.85, eyeWide: 1,    curve: 0,    blush: 0,    tilt: -0.08, lean: 0,     droop: 0, oneBrow: 0.18, lookUp: true },
    sorry:     { browY: 0.02,  browTilt: 0.38,  eyeOpen: 0.9,  eyeWide: 1,    curve: -0.8, blush: 0,    tilt: 0.06,  lean: 0.1,   droop: 0.25 },
    surprised: { browY: 0.13,  browTilt: 0.05,  eyeOpen: 1.25, eyeWide: 1.15, curve: 0,    blush: 0,    tilt: 0,     lean: -0.12, droop: -0.1, gasp: 0.6 },
    excited:   { browY: 0.1,   browTilt: -0.1,  eyeOpen: 0.4,  eyeWide: 1.1,  curve: 1.4,  blush: 0.6,  tilt: 0,     lean: 0,     droop: -0.2 },
  };
  const cur = { ...MOODS.happy, oneBrow: 0, gasp: 0 };
  let mood = 'happy', moodUntil = 0;
  let talking = false, reduce = false;
  let look = null, lookCur = { x: 0, y: 0 }, wander = { x: 0, y: 0, next: 0 };
  let blinkAt = 1.5, blinkT = -1;
  let action = null;               // { name, t, dur }
  let time = 0, lastNod = -10;
  const lerp = (a, b, k) => a + (b - a) * k;

  // bend the knees so the hips drop by d while the feet stay planted
  function crouch(leg, d, swing = 0) {
    const D = Math.max(0.05, Math.min(2 * L, 2 * L - d));
    const th = Math.acos(D / (2 * L));
    leg.hip.rotation.x = -th + swing;
    leg.knee.rotation.x = 2 * th;
    leg.ankle.rotation.x = -th - swing;
  }

  function update(dt) {
    dt = Math.min(dt, 0.1);
    time += dt;
    const now = performance.now();
    if (moodUntil && now > moodUntil) { mood = 'happy'; moodUntil = 0; }
    const tgt = { oneBrow: 0, gasp: 0, ...MOODS[mood] };
    const k = 1 - Math.exp(-dt * 9);
    for (const key in cur) if (typeof tgt[key] === 'number') cur[key] = lerp(cur[key], tgt[key], k);
    const motion = reduce ? 0 : 1;

    // eyes: follow the pointer, or look around by themselves
    if (time > wander.next) { wander = { x: Math.random() * 1.4 - 0.7, y: Math.random() * 0.8 - 0.4, next: time + 1.5 + Math.random() * 2.5 }; }
    let lx = look ? look.x : wander.x, ly = look ? look.y : wander.y;
    if (tgt.lookUp) { lx = 0.7; ly = 0.8; }
    lookCur.x = lerp(lookCur.x, lx, 1 - Math.exp(-dt * 12));
    lookCur.y = lerp(lookCur.y, ly, 1 - Math.exp(-dt * 12));

    // blink every few seconds
    if (blinkT < 0 && time > blinkAt) blinkT = 0;
    let blink = 1;
    if (blinkT >= 0) {
      blinkT += dt;
      blink = Math.abs(1 - blinkT / 0.075);
      if (blinkT > 0.15) { blinkT = -1; blinkAt = time + 2 + Math.random() * 3.5; blink = 1; }
    }
    const beam = cur.eyeOpen < 0.6;
    eyes.forEach(e => {
      e.g.visible = !beam; e.arc.visible = beam;
      e.g.scale.set(cur.eyeWide, Math.max(0.06, cur.eyeOpen * cur.eyeWide * blink), 1);
      e.pupils.position.x = lookCur.x * 0.075;
      e.pupils.position.y = lookCur.y * 0.07;
      e.pupils.visible = cur.eyeOpen * blink > 0.3;
    });
    brows.forEach((b, i) => {
      const extra = i === 1 ? cur.oneBrow : -cur.oneBrow * 0.3;
      b.pivot.position.y = cur.browY + extra + (talking ? Math.max(0, Math.sin(time * 6)) * 0.025 : 0);
      b.b.rotation.z = Math.PI / 2 - b.side * cur.browTilt;   // inner ends up when worried
    });

    // mouth
    let open = cur.gasp;
    if (talking) open = Math.max(open, 0.3 + 0.7 * Math.abs(Math.sin(time * 13) * Math.sin(time * 4.7 + 1)));
    mouthHole.scale.y = lerp(mouthHole.scale.y, Math.max(0.05, open), 1 - Math.exp(-dt * 25));
    mouthHole.visible = mouthHole.scale.y > 0.08;
    smile.visible = !mouthHole.visible && Math.abs(cur.curve) > 0.15;
    smile.rotation.z = cur.curve >= 0 ? Math.PI : 0;
    smile.scale.set(1, Math.min(1.3, Math.abs(cur.curve)), 1);
    smile.position.y = cur.curve >= 0 ? 0.04 : -0.06;
    cheeks.forEach(c => { c.material.opacity = cur.blush; });

    // mustache wiggles when he talks, droops when sorry
    stacheHalves.forEach((h, i) => {
      const wig = talking ? Math.sin(time * 13 + i) * 0.06 : Math.sin(time * 1.3 + i) * 0.015;
      h.rotation.z = (wig - cur.droop) * (i === 0 ? -1 : 1);
    });
    stache.position.y = -0.06 + (talking ? open * 0.03 : 0);

    // body: breathing, weight shift, lean, head tilt, turn toward where he looks
    let y = 0, d = 0, spin = 0, nodX = 0, swing = [0, 0];
    const breathe = Math.sin(time * 2.2) * 0.02;
    d = (0.04 + breathe + (talking ? Math.abs(Math.sin(time * 6.5)) * 0.04 : 0)) * motion;
    if (action) {
      action.t += dt;
      const p = Math.min(1, action.t / action.dur);
      if (action.name === 'nod') nodX = Math.sin(p * Math.PI * 4) * 0.18 * (1 - p);
      if (action.name === 'hop' || action.name === 'celebrate') {
        // crouch, jump, land
        if (p < 0.25) d = lerp(d, 0.22, p / 0.25) * motion;
        else if (p < 0.8) {
          const q = (p - 0.25) / 0.55;
          y = Math.sin(q * Math.PI) * (action.name === 'celebrate' ? 0.5 : 0.3) * motion;
          d = 0; swing = [Math.sin(q * Math.PI) * 0.5, Math.sin(q * Math.PI) * 0.5];
          if (action.name === 'celebrate') spin = q * Math.PI * 2 * motion;
        } else d = lerp(0.18, 0.04, (p - 0.8) / 0.2) * motion;
      }
      if (p >= 1) action = null;
    }
    // thinking: tap the right foot
    const tap = mood === 'thinking' && !action ? Math.max(0, Math.sin(time * 9)) * 0.35 * motion : 0;

    root.position.y = y;
    body.position.y = -d;
    body.rotation.z = lerp(body.rotation.z, cur.tilt + Math.sin(time * 0.9) * 0.03 * motion, k);
    body.rotation.x = cur.lean * 0.6 + nodX;
    body.rotation.y = spin + lookCur.x * 0.22;
    legs.forEach((leg, i) => {
      crouch(leg, d, swing[i]);
      leg.hip.rotation.z = (i === 0 ? 1 : -1) * (0.06 + (y > 0 ? 0.12 : 0));
      leg.hip.position.y = HIP_Y - d;
    });
    legs[1].ankle.rotation.x -= tap;
    hat.rotation.z = -0.22 + Math.sin(time * 1.7) * 0.02 * motion - y * 0.15;
    shadow.scale.setScalar(1 - y * 0.6); shadow.scale.y *= 0.5;
    shadow.position.y = FLOOR - 0.09 - y;
    shadow.material.opacity = 0.18 * (1 - y * 0.6);
  }

  return {
    object: root,
    FLOOR,
    update,
    setTalking(on) { talking = !!on; },
    setMood(name, ms = 2500) {
      if (!MOODS[name]) return;
      mood = name; moodUntil = ms ? performance.now() + ms : 0;
    },
    get mood() { return mood; },
    nod() { if (!action && time - lastNod > 3) { lastNod = time; action = { name: 'nod', t: 0, dur: 0.9 }; } },
    hop() { if (!action || action.name === 'nod') action = { name: 'hop', t: 0, dur: 0.75 }; },
    celebrate() { action = { name: 'celebrate', t: 0, dur: 1.1 }; this.setMood('excited', 3000); },
    lookAt(x, y) { look = x == null ? null : { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) }; },
    setReducedMotion(on) { reduce = !!on; },
  };
}
