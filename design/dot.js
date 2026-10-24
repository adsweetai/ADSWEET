/* AdSweet · Dot, het puntje uit het logo dat tot leven komt.
   <dot-karakter size="64" mood="rust|blij|praat|denkt|knipoog|viert" still label="Dot">
   <dot-intro height="120" theme="light|dark" play="1">  animatie: de dot springt uit het logo */
(function () {
  "use strict";
  const INK = "#151514", BODY = "#C7254E", ROOS = "#F28AB2";
  const CANDY = ["#F28AB2", "#F5CF5C", "#7FD3B0", "#A99BF2", "#8FC2F2", "#F7A97A"];
  const BASE = `@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;
  const eyesOpen = (dx, dy) => `<ellipse cx="${40 + dx}" cy="${50 + dy}" rx="4.6" ry="6" fill="${INK}"/><ellipse cx="${60 + dx}" cy="${50 + dy}" rx="4.6" ry="6" fill="${INK}"/><circle cx="${41.6 + dx}" cy="${47.8 + dy}" r="1.6" fill="#fff"/><circle cx="${61.6 + dx}" cy="${47.8 + dy}" r="1.6" fill="#fff"/>`;
  const arc = (x) => `<path d="M${x - 5.5} 51 Q${x} 44.5 ${x + 5.5} 51" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`;
  const MOUTH = {
    rust: `<path d="M43.5 61 Q50 67.5 56.5 61" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
    blij: `<path d="M42 60 Q50 73 58 60 Z" fill="${INK}"/><path d="M45.5 66 Q50 69.5 54.5 66" fill="${ROOS}"/>`,
    praat: `<ellipse class="tk" cx="50" cy="63" rx="5" ry="3.8" fill="${INK}"/>`,
    denkt: `<path d="M44.5 63.5 Q50 61 55.5 63" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
    knipoog: `<path d="M43 60.5 Q50 68.5 57 60.5" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  };
  MOUTH.viert = MOUTH.blij;
  const BODYSVG = `<circle cx="50" cy="50" r="40" fill="${BODY}"/><ellipse cx="36" cy="30" rx="10" ry="6" fill="#fff" fill-opacity=".55" transform="rotate(-28 36 30)"/><circle cx="30" cy="60" r="5" fill="${ROOS}" fill-opacity=".85"/><circle cx="70" cy="60" r="5" fill="${ROOS}" fill-opacity=".85"/>`;

  /* ---------- het karakter ---------- */
  const CCSS = `:host{display:inline-block;line-height:0;vertical-align:middle;flex:none}svg{display:block;overflow:visible}
.f{animation:fl 3.2s ease-in-out infinite}.hop{animation:hop 1.1s cubic-bezier(.2,.7,.2,1) infinite}
.sq{transform-box:fill-box;transform-origin:50% 100%;animation:sq 4.2s cubic-bezier(.2,.7,.2,1) infinite}
.ey{transform-box:fill-box;transform-origin:center;animation:bl 4.6s infinite}
.tk{transform-box:fill-box;transform-origin:center;animation:tk .42s ease-in-out infinite}
.dt{animation:dt 1.2s ease-in-out infinite}.dt:nth-child(2){animation-delay:.2s}.dt:nth-child(3){animation-delay:.4s}
.cf{transform-box:fill-box;transform-origin:center;animation:cf 1.6s cubic-bezier(.2,.7,.2,1) infinite}
@keyframes fl{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes hop{0%,100%{transform:translateY(0)}30%{transform:translateY(-10px)}60%{transform:translateY(0)}}
@keyframes sq{0%,84%,100%{transform:scale(1)}89%{transform:scale(1.07,.92)}94%{transform:scale(.96,1.04)}}
@keyframes bl{0%,93%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}
@keyframes tk{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.35)}}
@keyframes dt{0%,100%{opacity:.2}50%{opacity:1}}
@keyframes cf{0%{transform:translate(0,0) scale(.2);opacity:0}25%{opacity:1}100%{transform:translate(var(--x),var(--y)) scale(1);opacity:0}}
.still,.still *{animation:none!important}${BASE}`;
  function face(mood) {
    const eyes = mood === "blij" || mood === "viert" ? arc(40) + arc(60) : mood === "knipoog" ? arc(40) + `<g class="ey"><ellipse cx="60" cy="50" rx="4.6" ry="6" fill="${INK}"/><circle cx="61.6" cy="47.8" r="1.6" fill="#fff"/></g>` : `<g class="ey">${mood === "denkt" ? eyesOpen(2.5, -3) : eyesOpen(0, 0)}</g>`;
    return eyes + (MOUTH[mood] || MOUTH.rust);
  }
  function charSvg(mood) {
    const extra = mood === "denkt" ? `<g fill="${INK}" opacity=".5"><circle class="dt" cx="86" cy="14" r="3"/><circle class="dt" cx="94" cy="6" r="3.6"/><circle class="dt" cx="103" cy="-3" r="4.2"/></g>`
      : mood === "viert" ? CANDY.map((c, i) => { const a = (i / CANDY.length) * Math.PI * 2 - Math.PI / 2; return `<rect class="cf" x="48" y="${46 - (i % 2) * 2}" width="${i % 2 ? 6 : 5}" height="${i % 2 ? 6 : 8}" rx="${i % 3 ? 3 : 1}" fill="${c}" style="--x:${Math.round(Math.cos(a) * 46)}px;--y:${Math.round(Math.sin(a) * 40 - 8)}px;animation-delay:${i * 0.12}s"/>`; }).join("") : "";
    return `<g class="${mood === "viert" ? "hop" : "f"}"><g class="sq">${BODYSVG}${face(mood)}</g>${extra}</g>`;
  }
  class DotKarakter extends HTMLElement {
    static get observedAttributes() { return ["mood", "size", "still", "label"]; }
    connectedCallback() { if (!this.shadowRoot) this.attachShadow({ mode: "open" }); this.render(); }
    attributeChangedCallback() { if (this.shadowRoot) this.render(); }
    render() {
      const size = parseFloat(this.getAttribute("size")) || 56, mood = this.getAttribute("mood") || "rust", label = this.getAttribute("label");
      const still = this.hasAttribute("still") && this.getAttribute("still") !== "false";
      if (label) { this.setAttribute("role", "img"); this.setAttribute("aria-label", label); this.removeAttribute("aria-hidden"); } else this.setAttribute("aria-hidden", "true");
      this.shadowRoot.innerHTML = `<style>${CCSS}</style><svg class="${still ? "still" : ""}" width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${charSvg(mood)}</svg>`;
    }
  }
  if (!customElements.get("dot-karakter")) customElements.define("dot-karakter", DotKarakter);

  /* ---------- de intro: de dot springt uit het logo ---------- */
  const DUR = 7;
  const ICSS = `:host{display:block}
.st{position:relative}
.wm{position:absolute;left:0;display:block}
.dot{position:absolute;transform-origin:center;animation:jump ${DUR}s cubic-bezier(.3,.7,.3,1) both}
.dot svg{display:block;width:100%;height:100%;overflow:visible}
.face{opacity:0;animation:face ${DUR}s linear both}
.look{animation:look ${DUR}s ease-in-out both}
.blink{transform-box:fill-box;transform-origin:center;animation:blink ${DUR}s linear both}
.bub{position:absolute;padding:.55em .9em;background:#F5F4F0;color:${INK};border:1px solid rgba(21,21,20,.14);border-radius:1.1em 1.1em .25em 1.1em;box-shadow:0 12px 32px rgba(21,21,20,.12);font-family:"Host Grotesk","Helvetica Neue",Arial,sans-serif;font-weight:500;letter-spacing:-.01em;white-space:nowrap;opacity:0;transform-origin:100% 100%;animation:bub ${DUR}s cubic-bezier(.2,.7,.2,1) both}
.cf{position:absolute;border-radius:50%;opacity:0;animation:cf ${DUR}s cubic-bezier(.2,.7,.2,1) both}
@keyframes jump{
0%,9%{transform:none}
13%{transform:translate(0,10%) scale(1.18,.78)}
19%{transform:translate(60%,-300%) scale(1.4,1.7)}
26%{transform:translate(150%,-250%) scale(4.6)}
29%{transform:translate(150%,-250%) scale(5.3,4.4)}
33%{transform:translate(150%,-250%) scale(4.8,5.1)}
36%,68%{transform:translate(150%,-250%) scale(5)}
71%{transform:translate(150%,-238%) scale(5.3,4.6)}
78%{transform:translate(70%,-330%) scale(1.6,2)}
85%{transform:translate(0,0) scale(1.25,.75)}
89%{transform:translate(0,-60%) scale(.92,1.1)}
93%{transform:translate(0,0) scale(1.08,.94)}
97%,100%{transform:none}}
@keyframes face{0%,24%{opacity:0}29%,70%{opacity:1}75%,100%{opacity:0}}
@keyframes look{0%,40%{transform:none}43%,50%{transform:translateX(-5px)}54%,60%{transform:translateX(5px)}63%,100%{transform:none}}
@keyframes blink{0%,46%,49%,64%,67%,100%{transform:scaleY(1)}47.5%,65.5%{transform:scaleY(.1)}}
@keyframes bub{0%,37%{opacity:0;transform:scale(.6)}41%{opacity:1;transform:scale(1.04)}43%,64%{opacity:1;transform:scale(1)}68%,100%{opacity:0;transform:scale(.9)}}
@keyframes cf{0%,27%{opacity:0;transform:translate(0,0) scale(.3)}29%{opacity:1}42%,100%{opacity:0;transform:translate(var(--x),var(--y)) scale(1)}}
.still .dot,.still .face,.still .look,.still .blink,.still .bub,.still .cf{animation:none!important}
${BASE}`;
  class DotIntro extends HTMLElement {
    static get observedAttributes() { return ["height", "theme", "play", "text"]; }
    connectedCallback() { if (!this.shadowRoot) this.attachShadow({ mode: "open" }); this.render(); }
    attributeChangedCallback() { if (this.shadowRoot) this.render(); }
    render() {
      const H = parseFloat(this.getAttribute("height")) || 120, dark = this.getAttribute("theme") === "dark";
      const text = this.getAttribute("text") || "Hoi, ik ben Dot.";
      const u = H / 732, d = 152 * u, T = 0.95 * H;
      const cx = (3880 - 33) * u, cy = T + (720 - 72) * u;
      const W = cx + 1.95 * H, bigCx = cx + 1.5 * d, bigCy = cy - 2.5 * d, bigR = 2.5 * d;
      const fs = Math.max(14, Math.round(H * 0.17));
      const conf = CANDY.map((c, i) => { const a = (i / CANDY.length) * Math.PI * 2 + 0.3; const s = Math.round(d * (i % 2 ? 0.32 : 0.26)); return `<span class="cf" style="left:${bigCx - s / 2}px;top:${bigCy - s / 2}px;width:${s}px;height:${s}px;background:${c};border-radius:${i % 3 ? "50%" : "2px"};--x:${Math.round(Math.cos(a) * bigR * 1.7)}px;--y:${Math.round(Math.sin(a) * bigR * 1.5)}px"></span>`; }).join("");
      this.setAttribute("role", "img");
      this.setAttribute("aria-label", "Het puntje uit het logo van AdSweet springt eruit, krijgt een gezicht en zegt: " + text);
      this.shadowRoot.innerHTML = `<style>${ICSS}</style><div class="st" style="width:${Math.ceil(W)}px;height:${Math.ceil(T + H * 1.05)}px;max-width:100%">
<img class="wm" alt="" src="assets/${dark ? "adsweet-woordmerk-licht.svg" : "adsweet-woordmerk.svg"}" style="top:${T}px;height:${H}px;width:auto">
${conf}
<span class="bub" style="right:${Math.round(W - (bigCx - bigR * 0.85))}px;bottom:${Math.round(T + H * 1.05 - (bigCy - bigR * 0.35))}px;font-size:${fs}px">${text.replace(/</g, "&lt;")}</span>
<div class="dot" style="left:${cx - d / 2}px;top:${cy - d / 2}px;width:${d}px;height:${d}px"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${dark ? "#E0577A" : BODY}"/><g class="face"><ellipse cx="34" cy="26" rx="12" ry="7" fill="#fff" fill-opacity=".55" transform="rotate(-28 34 26)"/><circle cx="24" cy="62" r="6" fill="${ROOS}" fill-opacity=".85"/><circle cx="76" cy="62" r="6" fill="${ROOS}" fill-opacity=".85"/><g class="look"><g class="blink"><ellipse cx="38" cy="50" rx="5.5" ry="7.5" fill="${INK}"/><ellipse cx="62" cy="50" rx="5.5" ry="7.5" fill="${INK}"/><circle cx="40" cy="47" r="2" fill="#fff"/><circle cx="64" cy="47" r="2" fill="#fff"/></g></g><path d="M41 63 Q50 73 59 63" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/></g></svg></div>
</div>`;
    }
  }
  if (!customElements.get("dot-intro")) customElements.define("dot-intro", DotIntro);
})();
