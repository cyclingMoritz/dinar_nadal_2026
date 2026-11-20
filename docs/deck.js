/* Builds the slides from data/summary.json (written by pipeline/process.py). */
(() => {
  "use strict";

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pct = (x) => `${Math.round(x * 100)}%`;
  const short = (d) => d.replace(/^Thursday /, "Thu ");
  const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  const lc = (s) => s.replace(/^Traditional /, "").replace(/ or sharing plates$/, " / sharing");

  /* ---------- chart helper: single-series horizontal bars ---------- */
  function bars(items, { max, value, label, tip, top = 1 }) {
    const m = max ?? Math.max(...items.map(value));
    return `<ul class="chart">${items.map((it, i) => `
      <li class="${i < top ? "top" : ""}" tabindex="0" data-tip="${esc(tip(it))}">
        <span class="label">${esc(label(it))}</span>
        <span class="track"><span class="fill" data-w="${(value(it) / m) * 100}"></span></span>
        <span class="value">${fmt(value(it))}</span>
      </li>`).join("")}</ul>`;
  }

  /* ---------- slides ---------- */
  function build(d) {
    const c = d.conclusions;
    const n = d.responses;
    const acc = Object.fromEntries(d.price_acceptance.map((a) => [a.price, a]));
    const R = d.restaurants?.items ?? [];
    // Phrase dietary needs as what the menu should offer, not as a label on people.
    const menuNeeds = c.restrictions.map((r) => `a ${r.label.replace(/^No /i, "").toLowerCase()}-free option`).join(" and ");
    const needsLine = menuNeeds ? `The menu should include ${menuNeeds}.` : "No dietary requirements were reported.";
    const budgetLine = d.budget.map((b) => `${b.count} chose ${b.label.replace(/^Up/, "up")}`).join(" · ");

    const slides = [];

    slides.push({ cls: "", html: `
      <div class="inner">
        <p class="kicker">Survey results · ${n} responses · Draft</p>
        <h1 class="mega">Dinar<br>de Nadal</h1>
        <p class="lede">What the team asked for, what it means, and where we could go.</p>
      </div>` });

    slides.push({ cls: "light", html: `
      <div class="inner">
        <p class="kicker">01 — In one slide</p>
        <h2>Proposal: lunch in central Barcelona<br>on ${esc(c.date)}, at about €${c.price_everyone}–${c.price_everyone + 5} per person.</h2>
        <div class="facts">
          <div class="fact"><span class="mono">When</span><div class="big">${short(c.date)}</div>
            <p>${c.date_count} of ${n} are available. Alternative: ${short(c.date_alternative)}.</p></div>
          <div class="fact"><span class="mono">What</span><div class="big">${esc(lc(c.food[0]))} or ${esc(c.food[1])}</div>
            <p>The two most requested cuisines.</p></div>
          <div class="fact"><span class="mono">How much</span><div class="big">≈ €${c.price_everyone}–${c.price_everyone + 5}</div>
            <p>€${c.price_everyone} is within everyone’s budget; €30 is within ${acc[30].ok} of ${n}.</p></div>
          <div class="fact"><span class="mono">Where</span><div class="big">Centre</div>
            <p>${d.area[0].count} of ${n} prefer central Barcelona.</p></div>
          <div class="fact"><span class="mono">Who</span><div class="big">${c.group_size} pax</div>
            <p>${esc(needsLine)} No allergies reported.</p></div>
        </div>
      </div>` });

    slides.push({ cls: "", html: `
      <div class="inner two-col">
        <div>
          <p class="kicker">02 — When</p>
          <h2>${esc(c.date)} suits the most people.</h2>
          <p class="lede">${c.date_count} of ${n} are available (${pct(c.date_count / n)}). ${esc(c.date_alternative)} also works for the ${c.date_missing} who aren’t, with ${d.dates.find((x) => x.label === c.date_alternative)?.count ?? "?"} of ${n} available overall.</p>
        </div>
        ${bars(d.dates, { max: n, value: (x) => x.count, label: (x) => short(x.label), tip: (x) => `${x.count} of ${n} available (${pct(x.share)})` })}
      </div>` });

    slides.push({ cls: "light", html: `
      <div class="inner two-col">
        <div>
          <p class="kicker">03 — What</p>
          <h2>${esc(c.food[0])} and ${esc(c.food[1])} are the most requested.</h2>
          <p class="lede">${d.food.slice(2).map((f) => esc(/^(Tapas|Buffet)/.test(f.label) ? f.label.toLowerCase() : f.label)).join(", ").replace(/, ([^,]*)$/, " and $1")} were also chosen.</p>
          <p class="small note">The form allowed two choices; ${d.food_over_limit} people chose more. So that everyone counts equally, each person’s choices add up to one vote, split evenly (bar = weighted votes). ${d.food_blank} people left it blank.</p>
        </div>
        ${bars(d.food, { value: (x) => x.weighted, label: (x) => x.label, top: 2, tip: (x) => `${x.weighted} weighted votes · picked by ${x.mentions} of ${n}` })}
      </div>` });

    slides.push({ cls: "", html: `
      <div class="inner two-col">
        <div>
          <p class="kicker">04 — How much</p>
          <h2>A menu close to €${c.price_everyone} works for everyone’s budget.</h2>
          <p class="lede">Preferences per person, drinks included: ${esc(budgetLine)}.</p>
          <p class="small note">Bars: how many people’s stated budget covers a menu at each price.</p>
        </div>
        ${bars(d.price_acceptance, { max: n, value: (x) => x.ok, label: (x) => `Menu at €${x.price}`, tip: (x) => `${x.ok} of ${n} within budget (${pct(x.share)})` })}
      </div>` });

    slides.push({ cls: "light", html: `
      <div class="inner two-col">
        <div>
          <p class="kicker">05 — Where & who</p>
          <h2>Location and dietary requirements.</h2>
          <p class="lede">${d.area[0].count} prefer central Barcelona${d.area[1] ? `, ${d.area[1].count} near the office` : ""}, and ${d.area_blank} had no preference. ${esc(needsLine)} No allergies were reported.</p>
          <p class="small note">Free-text answers were reviewed separately and are not shown.</p>
        </div>
        ${bars(d.area, { max: n, value: (x) => x.count, label: (x) => x.label, tip: (x) => `${x.count} of ${n}` })}
      </div>` });

    if (R.length) {
      slides.push({ cls: "", html: `
        <div class="inner">
          <p class="kicker">06 — Where we could go</p>
          <h2>Restaurant shortlist.</h2>
          <p class="small" style="margin:-.4em 0 1.2em">Central Barcelona · accepts Ticket Restaurant (Edenred) · offers group menus.</p>
          <div class="shortlist">${R.slice(0, 8).map((r, i) => `
            <article class="resto">
              <span class="rank">${String(i + 1).padStart(2, "0")} · fit ${r.score}/100</span>
              <h3><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a></h3>
              <span class="meta">${esc(r.style)} · ${esc(r.area)}</span>
              <span class="row">~€${r.avg_price} avg · ${esc(r.group_room)}</span>
              <span class="row">${esc(r.address)}${r.phone ? ` · ${esc(r.phone)}` : ""}</span>
              ${r.notes ? `<span class="flag">${esc(r.notes)}</span>` : ""}
            </article>`).join("")}
          </div>
          <p class="small note">Fit = 50% food vote, 35% share of people the average price fits, 15% central. Average prices are à la carte from the directory, not group quotes. Ticket Restaurant acceptance from <a href="${esc(d.restaurants.source)}" target="_blank" rel="noopener">bcnrestaurantes.com</a>, checked ${esc(d.restaurants.checked)}.</p>
        </div>` });
    }

    slides.push({ cls: "light", html: `
      <div class="inner">
        <p class="kicker">07 — Next steps</p>
        <h2>Next steps.</h2>
        <ol class="steps">
          <li>Call the top 3–4 places for ${short(c.date)} lunch<span>Group menu for 15–20 at up to €${c.price_everyone + 5} with drinks${menuNeeds ? `, including ${menuNeeds}` : ""}.</span></li>
          <li>Confirm Edenred works for the group<span>Can 15–20 people each pay their share with their own card? Any surcharge? Check the card’s daily limit.</span></li>
          <li>Pick one and book by end of November<span>December lunch slots go fast.</span></li>
          <li>Share final date, place and menu<span>Open a sign-up for the final head count.</span></li>
        </ol>
      </div>` });

    return slides;
  }

  /* ---------- deck mechanics ---------- */
  const deck = document.getElementById("deck");
  const counter = document.getElementById("counter");
  const prev = document.getElementById("prev");
  const next = document.getElementById("next");
  const tip = Object.assign(document.createElement("div"), { className: "tip", role: "tooltip" });
  document.body.appendChild(tip);
  let els = [];
  let cur = 0;

  function go(i) {
    if (!els.length) return;
    cur = Math.max(0, Math.min(els.length - 1, i));
    els.forEach((el, k) => {
      const on = k === cur;
      el.classList.toggle("active", on);
      el.setAttribute("aria-hidden", String(!on));
      el.querySelectorAll(".fill").forEach((f) => { f.style.width = on ? `${f.dataset.w}%` : "0"; });
    });
    counter.textContent = `${String(cur + 1).padStart(2, "0")} / ${String(els.length).padStart(2, "0")}`;
    prev.disabled = cur === 0;
    next.disabled = cur === els.length - 1;
    history.replaceState(null, "", `#${cur + 1}`);
    tip.classList.remove("show");
  }

  function render(data) {
    deck.innerHTML = build(data).map((s) => `<section class="slide ${s.cls}">${s.html}</section>`).join("");
    els = [...deck.children];
    const h = parseInt(location.hash.slice(1), 10);
    go(Number.isFinite(h) ? h - 1 : 0);
  }

  window.addEventListener("hashchange", () => {
    const h = parseInt(location.hash.slice(1), 10);
    if (Number.isFinite(h) && h - 1 !== cur) go(h - 1);
  });
  prev.addEventListener("click", () => go(cur - 1));
  next.addEventListener("click", () => go(cur + 1));
  document.addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea")) return;
    if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); go(cur + 1); }
    if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); go(cur - 1); }
    if (e.key === "Home") go(0);
    if (e.key === "End") go(els.length - 1);
  });
  let tx = null;
  deck.addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; }, { passive: true });
  deck.addEventListener("touchend", (e) => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) go(cur + (dx < 0 ? 1 : -1));
    tx = null;
  });

  // Hover / focus tooltips on bars
  const showTip = (li, x, y) => { tip.textContent = li.dataset.tip; tip.style.left = `${x + 14}px`; tip.style.top = `${y + 14}px`; tip.classList.add("show"); };
  deck.addEventListener("mousemove", (e) => { const li = e.target.closest(".chart li"); li ? showTip(li, e.clientX, e.clientY) : tip.classList.remove("show"); });
  deck.addEventListener("mouseleave", () => tip.classList.remove("show"));
  deck.addEventListener("focusin", (e) => { const li = e.target.closest(".chart li"); if (li) { const r = li.getBoundingClientRect(); showTip(li, r.left + r.width / 2, r.top); } });
  deck.addEventListener("focusout", () => tip.classList.remove("show"));

  // Intro — timings and easings follow the site's GSAP loader timeline.
  const intro = document.getElementById("intro");
  let introAnims = [];
  const endIntro = () => {
    introAnims.forEach((a) => a.cancel());
    intro.classList.add("gone");
    document.removeEventListener("keydown", endIntro);
  };

  // The site's custom GSAP ease for the dive: "M0,0 C0.46,0 0.684,0.011 0.757,0.099 0.832,0.189 0.962,1 1,1".
  // Almost still for ~75% of the time, then a rush.
  const SITE_PATH = [[0, 0, 0.46, 0, 0.684, 0.011, 0.757, 0.099], [0.757, 0.099, 0.832, 0.189, 0.962, 1, 1, 1]];
  function siteEase(x) {
    const seg = x <= 0.757 ? SITE_PATH[0] : SITE_PATH[1];
    const [x0, y0, x1, y1, x2, y2, x3, y3] = seg;
    const bz = (t, a, b, c, d) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; };
    let lo = 0, hi = 1;
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; (bz(m, x0, x1, x2, x3) < x ? (lo = m) : (hi = m)); }
    return bz((lo + hi) / 2, y0, y1, y2, y3);
  }

  function runIntro() {
    const wrap = intro.querySelector(".intro-text");
    const stem = intro.querySelector(".intro-stem");
    const gallery = intro.querySelector(".intro-gallery");
    const tiles = [...gallery.children];
    const W = innerWidth, H = innerHeight, mobile = W < 760;
    const T0 = 300;                 // initial pause
    const DIVE = 1300;              // zoom into the letter
    const BURST = T0 + DIVE - 60;   // tiles appear as the screen turns black
    const BURST_LEN = 1600;
    const OPEN = T0 + 2500;         // window opens onto the deck
    const anim = (el, kf, opt) => { const a = el.animate(kf, { fill: "forwards", ...opt }); introAnims.push(a); return a; };

    // 1 — Dive: zoom around the stem of the "I", pulling it to the screen centre until it fills it.
    //     Driven per frame (not a compositor animation) so the text re-renders sharp as it grows.
    const sr = stem.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
    const ox = sr.left + sr.width * 0.45, oy = sr.top + sr.height * 0.55;
    wrap.style.transformOrigin = `${ox - wr.left}px ${oy - wr.top}px`;
    const dx = W / 2 - ox, dy = H / 2 - oy;
    const S = Math.max(200, (7 * Math.max(W, H)) / sr.width); // stem ≈ ⅓ of the glyph box → overfill the screen
    const dive = anim(document.createElement("i"), [{ opacity: 0 }, { opacity: 1 }], { duration: DIVE, delay: T0 }); // clock only
    const paint = () => {
      const p = siteEase(Math.min(1, Math.max(0, ((dive.currentTime ?? 0) - T0) / DIVE)));
      wrap.style.transform = `translate(-50%, -50%) translate(${dx * p}px, ${dy * p}px) scale(${1 + (S - 1) * p})`;
    };
    const loop = () => { paint(); if (!intro.classList.contains("gone") && dive.playState !== "finished") requestAnimationFrame(loop); else paint(); };
    requestAnimationFrame(loop);
    anim(wrap, [{ opacity: 1 }, { opacity: 0 }], { duration: 100, delay: T0 + DIVE - 100 });

    // 2 — Burst: the grid grows while each tile flies outwards, centre tiles growing most.
    anim(gallery, [{ opacity: 0 }, { opacity: 1 }], { duration: 100, delay: BURST });
    anim(gallery, [{ transform: "scale(.5)" }, { transform: "scale(1.5)" }],
      { duration: BURST_LEN, delay: BURST, easing: "cubic-bezier(.1,.45,.85,.55)" });
    gallery.style.transform = "scale(.5)";
    const R = Math.max(W, H) / 2;
    tiles.forEach((t) => {
      const r = t.getBoundingClientRect();
      const ix = r.left + r.width / 2 - W / 2;
      const iy = (r.top + r.height / 2 - H / 2) * 0.7;
      const o = Math.hypot(ix, iy) || 1;
      const sc = 1 + Math.max(0, 1 - o / R) * 8;
      anim(t, [{ transform: "translate(0,0) scale(1)" },
        { transform: `translate(${R * ix / o * 0.7}px, ${R * iy / o * 0.7 * (mobile ? 1.2 : 0.7)}px) scale(${sc})` }],
        { duration: BURST_LEN, delay: BURST, easing: "cubic-bezier(.55,.055,.675,.19)" });
    });

    // 3 — Window: a rectangular hole opens in the loader; the first slide scales up behind it.
    //     Same polygon as the site's clip-path; animating the polygon directly keeps
    //     everything on one timeline (no timers, no @property needed).
    const hole = (m) => `polygon(0% 0%, 0% 100%, ${m}% 100%, ${m}% ${m}%, ${100 - m}% ${m}%, ${100 - m}% ${100 - m}%, ${m}% ${100 - m}%, ${m}% 100%, 100% 100%, 100% 0%)`;
    const OPEN_EASE = "cubic-bezier(.165,.84,.44,1)";
    const first = document.querySelector(".slide.active .inner");
    if (first) {
      anim(first, [{ transform: "scale(.6)" }, { transform: "scale(1)" }], { duration: 1500, delay: OPEN, easing: OPEN_EASE, fill: "both" });
      anim(first, [{ opacity: 0 }, { opacity: 1 }], { duration: 100, delay: OPEN, fill: "both" });
    }
    const open = anim(intro, [{ clipPath: hole(70) }, { clipPath: hole(100) }], { duration: 500, delay: OPEN, easing: OPEN_EASE });

    // Debug: ?introAt=1500 freezes the intro at that moment (for checking frames).
    const at = parseInt(new URLSearchParams(location.search).get("introAt"), 10);
    if (Number.isFinite(at)) {
      introAnims.forEach((x) => { x.pause(); x.currentTime = at; });
      paint();
      return;
    }
    open.finished.then(() => {
      intro.classList.add("gone");
      introAnims.filter((x) => x.effect.target !== intro).forEach((x) => x.cancel()); // drop fills on the slide
    }).catch(() => {});
  }

  let rendered;
  const deckReady = new Promise((r) => { rendered = r; });

  if (matchMedia("(prefers-reduced-motion: reduce)").matches || (location.hash && location.hash !== "#1")) {
    endIntro();
  } else {
    intro.addEventListener("click", endIntro);
    document.addEventListener("keydown", endIntro);
    // Start once the web font is in (so the dive hits the letter stem) and the first slide exists.
    const fontsIn = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);
    Promise.all([fontsIn, deckReady]).then(runIntro);
  }

  fetch("data/summary.json", { cache: "no-store" })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(render)
    .then(() => rendered())
    .catch((err) => {
      deck.innerHTML = `<section class="slide active centered"><div class="inner"><h2>Couldn’t load the data.</h2><p class="small">Run <code>python pipeline/process.py</code>, then serve <code>docs/</code> over HTTP (${esc(err.message)}).</p></div></section>`;
    });
})();
