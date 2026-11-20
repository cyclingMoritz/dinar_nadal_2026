/* Original music-box waltz (Web Audio), written for the /burton theme and parked here:
   music is off for now. To re-enable: copy into docs/, load it on the theme page and add
   <button id="sound" aria-pressed="false" aria-label="Play music">♪</button> to the controls. */
(() => {
  "use strict";
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  };
  /* ---------------- music ---------------- */
  const btn = document.getElementById("sound");
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!btn || !AC) { if (btn) btn.hidden = true; return; }

  const BPM = 138, BEAT = 60 / BPM, BAR = 3 * BEAT;
  const hz = (m) => 440 * 2 ** ((m - 69) / 12);

  // Chords per bar (root + chord tones as MIDI). D minor, 16-bar loop.
  const C = {
    Dm: [50, 62, 65, 69], F: [53, 65, 69, 72], Bb: [46, 62, 65, 70], Gm: [43, 62, 67, 70],
    A: [45, 61, 64, 69], A7: [45, 61, 67, 69],
  };
  const chords = ["Dm", "Dm", "Bb", "Bb", "Gm", "Gm", "A", "A7", "Dm", "F", "Gm", "A", "Dm", "Bb", "A", "Dm"];
  // Melody: [beat, midi, beats] per bar — an original tune.
  const melody = [
    [[0, 69, 1], [1, 74, 1], [2, 77, 1]],
    [[0, 76, 2], [2, 74, 1]],
    [[0, 74, 1], [1, 77, 1], [2, 82, 1]],
    [[0, 81, 2], [2, 77, 1]],
    [[0, 79, 1], [1, 74, 1], [2, 70, 1]],
    [[0, 72, 2], [2, 70, 1]],
    [[0, 69, 1], [1, 73, 1], [2, 76, 1]],
    [[0, 79, 1], [1, 77, 1], [2, 76, 1]],
    [[0, 74, 2], [2, 69, 1]],
    [[0, 72, 1], [1, 77, 1], [2, 81, 1]],
    [[0, 82, 2], [2, 79, 1]],
    [[0, 76, 1], [1, 73, 1], [2, 69, 1]],
    [[0, 77, 1], [1, 76, 1], [2, 74, 1]],
    [[0, 74, 1], [1, 77, 1], [2, 82, 1]],
    [[0, 81, 1.5], [1.5, 79, 0.5], [2, 73, 1]],
    [[0, 74, 3]],
  ];

  let ac, master, wet, timer, nextBar = 0, barIdx = 0, playing = false, noise;

  function setup() {
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0;
    const comp = ac.createDynamicsCompressor();
    master.connect(comp).connect(ac.destination);
    // Small hall: convolver with a decaying-noise impulse.
    const len = Math.floor(ac.sampleRate * 2.6), ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    }
    const verb = ac.createConvolver(); verb.buffer = ir;
    wet = ac.createGain(); wet.gain.value = 0.38;
    wet.connect(verb).connect(master);
    noise = ac.createBuffer(1, ac.sampleRate * 0.3, ac.sampleRate);
    const nd = noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }

  const out = (node, dry = 1) => { const g = ac.createGain(); g.gain.value = dry; node.connect(g).connect(master); node.connect(wet); };

  function musicBox(m, t, beats, vel = 0.22) {
    const f = hz(m), env = ac.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(vel, t + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0008, t + Math.max(0.9, beats * BEAT * 2.2));
    [[1, 1, "sine"], [2.004, 0.28, "sine"], [3.01, 0.08, "triangle"], [5.43, 0.03, "sine"]].forEach(([mult, g, type]) => {
      const o = ac.createOscillator(), og = ac.createGain();
      o.type = type; o.frequency.value = f * mult; og.gain.value = g;
      o.connect(og).connect(env); o.start(t); o.stop(t + 3.5);
    });
    out(env, 0.9);
  }

  function pizz(m, t, vel = 0.16) {
    const o = ac.createOscillator(), lp = ac.createBiquadFilter(), env = ac.createGain();
    o.type = "triangle"; o.frequency.value = hz(m);
    lp.type = "lowpass"; lp.frequency.value = 900;
    env.gain.setValueAtTime(vel, t); env.gain.exponentialRampToValueAtTime(0.0005, t + 0.38);
    o.connect(lp).connect(env); o.start(t); o.stop(t + 0.45);
    out(env, 1);
  }

  function bells(t, vel = 0.05) { // a soft sleigh-bell shimmer: the Christmas taking over
    for (let k = 0; k < 3; k++) {
      const s = ac.createBufferSource(), bp = ac.createBiquadFilter(), env = ac.createGain(), tt = t + k * 0.045;
      s.buffer = noise; bp.type = "bandpass"; bp.frequency.value = 7200 + k * 900; bp.Q.value = 9;
      env.gain.setValueAtTime(vel, tt); env.gain.exponentialRampToValueAtTime(0.0003, tt + 0.12);
      s.connect(bp).connect(env); s.start(tt); s.stop(tt + 0.15);
      out(env, 0.8);
    }
  }

  function scheduleBar(i, t) {
    const ch = C[chords[i]], loop = Math.floor(barCount / 16);
    pizz(ch[0], t, 0.2);                       // oom
    pizz(ch[1] + 12, t + BEAT); pizz(ch[2] + 12, t + BEAT, 0.12);   // pah
    pizz(ch[1] + 12, t + 2 * BEAT); pizz(ch[3], t + 2 * BEAT, 0.12); // pah
    melody[i].forEach(([b, m, d]) => musicBox(m, t + b * BEAT, d));
    if (loop % 2 === 1) melody[i].forEach(([b, m, d]) => musicBox(m + 12, t + b * BEAT + BEAT / 2, d, 0.06)); // echo, 2nd time round
    if (i % 4 === 3 || loop > 0) bells(t + 2 * BEAT, loop > 0 ? 0.045 : 0.03);
  }

  let barCount = 0;
  function pump() {
    while (nextBar < ac.currentTime + 0.25) {
      scheduleBar(barIdx, nextBar);
      nextBar += BAR; barIdx = (barIdx + 1) % 16; barCount++;
    }
  }

  async function play() {
    if (!ac) setup();
    await ac.resume();
    if (playing) return;
    playing = true;
    nextBar = ac.currentTime + 0.08;
    master.gain.cancelScheduledValues(ac.currentTime);
    master.gain.setTargetAtTime(0.6, ac.currentTime, 0.6);
    timer = setInterval(pump, 40); pump();
    btn.setAttribute("aria-pressed", "true"); btn.setAttribute("aria-label", "Mute music");
  }

  function stop() {
    if (!playing) return;
    playing = false; clearInterval(timer);
    master.gain.setTargetAtTime(0, ac.currentTime, 0.15);
    btn.setAttribute("aria-pressed", "false"); btn.setAttribute("aria-label", "Play music");
  }

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (playing) { stop(); store.set("burton-music", "off"); } else { store.set("burton-music", "on"); play(); }
  });
  addEventListener("keydown", (e) => { if (e.key === "m" || e.key === "M") btn.click(); });

  // Start on the first interaction unless the viewer muted it before.
  const first = (e) => {
    if (e.target === btn || (e.key && e.key.toLowerCase() === "m")) return;
    removeEventListener("pointerdown", first, true); removeEventListener("keydown", first, true);
    if (store.get("burton-music") !== "off") play();
  };
  addEventListener("pointerdown", first, true);
  addEventListener("keydown", first, true);
  document.addEventListener("visibilitychange", () => { if (ac && document.hidden) ac.suspend(); else if (ac && playing) ac.resume(); });
})();
