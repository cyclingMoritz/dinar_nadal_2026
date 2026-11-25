/* Canvas background effects, loaded on demand by deck.js when a theme sets `fx`.
   One shared canvas/resize/loop; each effect only defines init + draw. */
window.DeckFX = (() => {
  "use strict";
  const rand = (a, b) => a + Math.random() * (b - a);

  const effects = {
    // Burton: soft snow drifting down.
    snow: {
      init: (W, H) => Array.from({ length: Math.round(Math.min(140, (W * H) / 11000)) }, () => ({
        x: rand(0, W), y: rand(0, H), r: rand(0.6, 2.7), v: rand(0.25, 1.05), a: rand(0, 6.3), s: rand(0.004, 0.016),
      })),
      draw(ctx, flakes, W, H) {
        ctx.fillStyle = "rgba(255,255,255,.85)";
        for (const f of flakes) {
          f.a += f.s; f.y += f.v; f.x += Math.sin(f.a) * 0.45;
          if (f.y > H + 4) { f.y = -4; f.x = rand(0, W); }
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fill();
        }
      },
    },

    // Galaxy: twinkling stars drifting slowly, three depths.
    stars: {
      init: (W, H) => Array.from({ length: Math.round(Math.min(260, (W * H) / 5000)) }, () => {
        const z = Math.random();
        return { x: rand(0, W), y: rand(0, H), r: 0.3 + z * 1.4, v: 0.02 + z * 0.12, t: rand(0, 6.3), s: rand(0.01, 0.05) };
      }),
      draw(ctx, stars, W) {
        for (const s of stars) {
          s.t += s.s; s.x -= s.v;
          if (s.x < -2) s.x = W + 2;
          ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.65 * (0.5 + 0.5 * Math.sin(s.t))})`;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
        }
      },
    },

    // Summer-night fireflies: slow wandering glows that pulse on and off.
    fireflies: {
      init: (W, H) => Array.from({ length: Math.round(Math.min(46, (W * H) / 26000)) }, () => ({
        x: rand(0, W), y: rand(H * 0.3, H), a: rand(0, 6.3), v: rand(0.15, 0.45), t: rand(0, 6.3), s: rand(0.01, 0.03),
      })),
      draw(ctx, flies, W, H) {
        for (const f of flies) {
          f.a += rand(-0.08, 0.08); f.t += f.s;
          f.x += Math.cos(f.a) * f.v; f.y += Math.sin(f.a) * f.v * 0.6;
          if (f.x < -10) f.x = W + 10; if (f.x > W + 10) f.x = -10;
          if (f.y < H * 0.2) f.a = Math.abs(f.a); if (f.y > H + 10) f.y = H * 0.4;
          const glow = Math.max(0, Math.sin(f.t)) ** 2;
          if (glow < 0.02) continue;
          const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 9);
          g.addColorStop(0, `rgba(255,236,140,${0.95 * glow})`); g.addColorStop(1, "rgba(255,220,90,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, 9, 0, 6.283); ctx.fill();
        }
      },
    },

    // Panther: a trail of paw prints crosses the screen every few seconds, then fades.
    paws: {
      init: () => ({ prints: [], nextTrail: 600 }),
      draw(ctx, st, W, H, now) {
        if (now > st.nextTrail) {
          st.nextTrail = now + rand(5000, 8000);
          const fromLeft = Math.random() < 0.5;
          const x0 = fromLeft ? -30 : W + 30, y0 = rand(H * 0.2, H * 0.9);
          const ang = (fromLeft ? 0 : Math.PI) + rand(-0.35, 0.35);
          const steps = Math.ceil(Math.hypot(W, H) / 52);
          for (let i = 0; i < steps; i++) {
            const side = i % 2 ? 1 : -1;
            st.prints.push({
              x: x0 + Math.cos(ang) * i * 52 - Math.sin(ang) * side * 13,
              y: y0 + Math.sin(ang) * i * 52 + Math.cos(ang) * side * 13,
              a: ang, born: now + i * 230,
            });
          }
        }
        st.prints = st.prints.filter((p) => now - p.born < 4200);
        for (const p of st.prints) {
          const age = now - p.born;
          if (age < 0) continue;
          ctx.save();
          ctx.globalAlpha = Math.min(1, age / 160) * (1 - age / 4200) * 0.55;
          ctx.translate(p.x, p.y); ctx.rotate(p.a + Math.PI / 2);
          ctx.fillStyle = "#e2337f";
          ctx.beginPath(); ctx.ellipse(0, 4, 7, 6, 0, 0, 6.283); ctx.fill();          // pad
          for (const [tx, ty] of [[-7, -5], [-2.5, -9], [2.5, -9], [7, -5]]) {          // toes
            ctx.beginPath(); ctx.ellipse(tx, ty, 2.3, 2.9, 0, 0, 6.283); ctx.fill();
          }
          ctx.restore();
        }
      },
    },
  };

  function start(kind, canvas) {
    const fx = effects[kind];
    if (!fx || !canvas) return;
    const ctx = canvas.getContext("2d");
    let W = 0, H = 0, state;
    const resize = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      W = innerWidth; H = innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      state = fx.init(W, H);
    };
    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      fx.draw(ctx, state, W, H, performance.now());
      requestAnimationFrame(tick);
    };
    addEventListener("resize", resize);
    resize();
    requestAnimationFrame(tick);
  }

  return { start };
})();
