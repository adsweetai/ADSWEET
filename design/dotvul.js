/* AdSweet · Dot vult de campagnewizard in: vliegt uit de knop, langs elk veld, en terug. window.DotFill */
(function () {
  "use strict";
  if (window.DotFill) return;
  const CANDY = ["#F28AB2", "#F5CF5C", "#7FD3B0", "#A99BF2", "#8FC2F2", "#F7A97A"];
  const RM = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, RM() ? Math.min(ms, 120) : ms));
  let fly = null, dot = null, bub = null, pos = { x: 0, y: 0 }, hidden = null;
  const S = 56;
  function ensure() {
    if (fly) return;
    fly = document.createElement("div");
    fly.style.cssText = "position:fixed; left:0; top:0; z-index:97; pointer-events:none; width:" + S + "px; height:" + S + "px; will-change:transform; filter:drop-shadow(0 8px 14px rgba(21,21,20,.25));";
    dot = document.createElement("dot-karakter"); dot.setAttribute("size", String(S)); dot.setAttribute("mood", "blij");
    bub = document.createElement("span");
    bub.style.cssText = "position:absolute; right:calc(100% + 8px); top:4px; padding:8px 12px; background:var(--surface, #F5F4F0); color:var(--ink, #151514); border:1px solid var(--line, rgba(21,21,20,.14)); border-radius:14px 14px 4px 14px; box-shadow:0 12px 32px rgba(21,21,20,.16); font:500 14px/1.3 'Host Grotesk', sans-serif; white-space:nowrap; opacity:0; transform:scale(.7); transform-origin:100% 100%; transition:opacity 200ms ease, transform 300ms cubic-bezier(.2,.7,.2,1);";
    fly.append(dot, bub); document.body.appendChild(fly);
  }
  function setPos(x, y, sc) { pos = { x, y }; fly.style.transform = "translate(" + (x - S / 2) + "px," + (y - S / 2) + "px) scale(" + (sc == null ? 1 : sc) + ")"; }
  function arc(x, y, ms, s0, s1) {
    const a = pos, mid = { x: (a.x + x) / 2, y: Math.min(a.y, y) - Math.min(140, 40 + Math.hypot(x - a.x, y - a.y) * 0.25) };
    const tf = (p, sc) => "translate(" + (p.x - S / 2) + "px," + (p.y - S / 2) + "px) scale(" + sc + ")";
    const k = [{ transform: tf(a, s0) }, { transform: tf(mid, (s0 + s1) / 2 * 1.08), offset: 0.5 }, { transform: tf({ x, y }, s1) }];
    pos = { x, y };
    if (RM()) { fly.style.transform = tf({ x, y }, s1); return Promise.resolve(); }
    const an = fly.animate(k, { duration: ms, easing: "cubic-bezier(.3,.7,.3,1)", fill: "forwards" });
    return an.finished.then(() => { fly.style.transform = tf({ x, y }, s1); an.cancel(); });
  }
  function sparkle(r) {
    if (RM()) return;
    for (let i = 0; i < 9; i++) {
      const s = document.createElement("span"), z = 5 + (i % 3) * 2, c = CANDY[i % CANDY.length];
      const x = r.left + Math.random() * r.width, y = r.top + Math.random() * r.height;
      s.style.cssText = "position:fixed; z-index:96; pointer-events:none; left:" + x + "px; top:" + y + "px; width:" + z + "px; height:" + z + "px; border-radius:" + (i % 2 ? "50%" : "2px") + "; background:" + c + ";";
      document.body.appendChild(s);
      s.animate([{ transform: "scale(0) rotate(0)", opacity: 0 }, { transform: "scale(1.2) rotate(90deg)", opacity: 1, offset: 0.35 }, { transform: "translateY(-14px) scale(.4) rotate(180deg)", opacity: 0 }], { duration: 700 + Math.random() * 300, delay: i * 40, easing: "ease-out", fill: "forwards" }).finished.then(() => s.remove());
    }
    const ring = document.createElement("span");
    ring.style.cssText = "position:fixed; z-index:95; pointer-events:none; left:" + (r.left - 4) + "px; top:" + (r.top - 4) + "px; width:" + (r.width + 8) + "px; height:" + (r.height + 8) + "px; border-radius:14px; box-shadow:0 0 0 2px " + CANDY[Math.floor(Math.random() * CANDY.length)] + ";";
    document.body.appendChild(ring);
    ring.animate([{ opacity: 0, transform: "scale(.98)" }, { opacity: 1, transform: "scale(1)", offset: 0.3 }, { opacity: 0, transform: "scale(1.02)" }], { duration: 800, easing: "ease-out", fill: "forwards" }).finished.then(() => ring.remove());
  }
  async function into(el) {
    let r = el.getBoundingClientRect();
    if (r.top < 70 || r.bottom > innerHeight - 20) { window.scrollTo({ top: scrollY + r.top - innerHeight / 3, behavior: RM() ? "auto" : "smooth" }); await wait(380); r = el.getBoundingClientRect(); }
    return r;
  }
  const DotFill = {
    wait,
    say(text, mood) { ensure(); if (mood) dot.setAttribute("mood", mood); bub.textContent = text; bub.style.opacity = text ? "1" : "0"; bub.style.transform = text ? "scale(1)" : "scale(.7)"; },
    async launch(sel) {
      ensure(); const b = document.querySelector(sel); if (!b) return;
      const r = b.getBoundingClientRect(); hidden = b.querySelector("dot-karakter"); if (hidden) hidden.style.opacity = "0";
      setPos(r.left + 22, r.top + r.height / 2, 0.35); fly.style.display = "block"; dot.setAttribute("mood", "blij");
      await arc(r.left + 22, r.top - 34, 420, 0.35, 1);
    },
    async visit(el, mood) {
      if (!el) return; ensure(); const r = await into(el);
      dot.setAttribute("mood", mood || "praat");
      await arc(Math.min(r.right - 8, innerWidth - 40), Math.max(40, r.top - 18), 560, 1, 1);
      sparkle(r);
      if (!RM()) fly.animate([{ transform: fly.style.transform }, { transform: fly.style.transform + " translateY(6px) scale(1.08,.9)" }, { transform: fly.style.transform }], { duration: 320, easing: "ease-out" });
      await wait(520);
    },
    async home(sel) {
      ensure(); this.say("", "knipoog"); const b = document.querySelector(sel);
      if (b) { const r = await into(b); await arc(r.left + 22, r.top + r.height / 2, 620, 1, 0.3); }
      fly.style.display = "none"; if (hidden) hidden.style.opacity = ""; hidden = null;
      if (b && !RM()) b.animate([{ transform: "scale(1)" }, { transform: "scale(1.06)" }, { transform: "scale(1)" }], { duration: 360, easing: "ease-out" });
    },
  };
  window.DotFill = DotFill;
})();
