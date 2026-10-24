/* AdSweet · rondleidingen (spotlight met uitleg per stap) en uitleg bij vakwoorden.
   window.AdSweetTour.start(naam, { force }) · .auto(route) · .reset()
   Doelen in de pagina: [data-tour="..."]. Vakwoorden krijgen een stippellijn via ::highlight(as-term). */
(function () {
  "use strict";
  if (window.AdSweetTour) return;
  if (!customElements.get('dot-karakter') && !document.querySelector('script[src="dot.js"]')) { const sc = document.createElement('script'); sc.src = 'dot.js'; document.head.appendChild(sc); }
  const CANDY = ["#F28AB2", "#F5CF5C", "#7FD3B0", "#A99BF2", "#8FC2F2", "#F7A97A"];
  const EASE = "cubic-bezier(.2,.7,.2,1)";
  const reduce = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let layer = null;
  function getLayer() {
    if (layer && document.body.contains(layer)) return layer;
    layer = document.createElement("div");
    layer.id = "as-layer";
    document.body.appendChild(layer);
    return layer;
  }

  /* ---------- Rondleidingen ---------- */
  const TOURS = {
    app: { route: "vandaag", steps: [
      { t: "Hoi, ik ben Dot.", d: "Het puntje uit het logo, en je assistent bij AdSweet. In {n} korte stappen laat ik je zien waar alles staat en wat je elke dag doet. Je kan altijd stoppen." },
      { sel: '[data-tour="nav"]', t: "Je menu", d: "Hier vind je alles: Vandaag, je campagnes, je advertenties, je cijfers en de Academy. Onderaan staan Hulp en je instellingen." },
      { sel: '[data-tour="account"]', t: "Je advertentieaccount", d: "Hier zie je in welk advertentieaccount je werkt. Met Scale of Agency wissel je hier van account of klant." },
      { sel: '[data-tour="greet"]', t: "Vandaag, in één zin", d: "Elke ochtend vat AdSweet samen hoe je advertenties het doen, en hoeveel er vandaag te doen is." },
      { sel: '[data-tour="tile"]', t: "De EuroTegel", d: "Van links naar rechts: wat je uitgaf, wat het opleverde en of je eraan verdient. Woorden met een stippellijn leggen we uit als je erover beweegt of erop tikt." },
      { sel: '[data-tour="cards"]', t: "Wat je vandaag best doet", d: "Elke kaart is een voorstel uit de audit van vannacht, met de cijfers en de reden. Eén klik en het is gedaan. AdSweet zet nooit zelf een advertentie af." },
      { sel: '[data-tour="lists"]', t: "Wat goed en minder loopt", d: "Je advertenties met hun label: Winnaar, Nog geen winnaar, Verliezer of Te vroeg om te zeggen. Klik erop voor de details." },
      { sel: '[data-tour="period"]', t: "Kies je periode", d: "Bekijk gisteren, de laatste 7 of 30 dagen, of alles sinds de start." },
      { sel: '[data-tour="bell"]', t: "Meldingen", d: "Is er iets dringends, zoals een betaalprobleem bij Meta, dan zie je het hier en in je mailbox." },
      { sel: '[data-tour="new"]', t: "Een nieuwe campagne", d: "Start hier een campagne. AdSweet vult alles voor volgens het playbook. Jij zet er je beelden in." },
      { sel: '[data-tour="parel"]', t: "Hier woon ik", d: "Klik op mij en vraag wat je wil: over je cijfers, of laat me een campagne uitschrijven. Ik doe niets zonder jouw klik." },
      { sel: '[data-tour="help"]', t: "Uitleg nodig?", d: "Met deze knop krijg je uitleg bij de pagina waar je bent. In Hulp start je deze rondleiding opnieuw." },
    ] },
    campagne: { route: "campagne", steps: [
      { sel: '[data-tour="c-head"]', t: "Je campagne in één oogopslag", d: "Naam, status, soort en budget per dag. Rechts voeg je advertenties toe, deel je een preview of pauzeer je." },
      { sel: '[data-tour="c-tabs"]', t: "Vier tabs", d: "Overzicht, Advertenties, Instellingen en Logboek. In het logboek zie je elke wijziging, ook die buiten AdSweet." },
      { sel: '[data-tour="c-tile"]', t: "Wat deze campagne opbracht", d: "De EuroTegel van deze campagne, in de periode die je bovenaan kiest." },
      { sel: '[data-tour="c-tree"]', t: "De structuur", d: "Campagne, ad set en advertenties, zoals het playbook ze opbouwt: 1 campagne, 1 ad set, 5 advertenties. Klik op een advertentie voor de details." },
      { sel: '[data-tour="c-lock"]', t: "Lopende ad sets blijven met rust", d: "Een wijziging zet een ad set terug in de leerfase. Nieuwe advertenties komen daarom in een nieuwe ad set." },
      { sel: '[data-tour="c-funnel"]', t: "De funnelbalk", d: "Hoeveel advertenties je per fase hebt: top, middle en bottom. Een ontbrekende fase krijgt een streepjesrand." },
      { sel: '[data-tour="c-budget"]', t: "Budget en schalen", d: "Doet je campagne het goed, dan stelt AdSweet voor om het budget te verhogen. Jij beslist." },
    ] },
    wizard: { route: "campagne-nieuw", steps: [
      { t: "Een nieuwe campagne", d: "In 9 stappen zet je een campagne klaar. Alles staat al ingevuld volgens het playbook. Aanpassen mag, moet niet." },
      { sel: '[data-tour="w-steps"]', t: "De stappen", d: "Van wat je wil doen tot live zetten. Je kan altijd terug naar een vorige stap." },
      { sel: '[data-tour="w-choices"]', t: "Kies wat past", d: "Het aanbevolen pad staat al geselecteerd. Een speciaal moment, zoals de feestdagen, wordt een aparte campagne naast je vaste." },
      { sel: '[data-tour="w-parel"]', t: "Laat Dot het voorstellen", d: "Twijfel je? Dot vult de stap in volgens het playbook en je cijfers." },
      { sel: '[data-tour="w-sum"]', t: "De samenvatting", d: "Hier zie je wat je koos. Wijkt iets af van het playbook, dan staat het hier in rood." },
      { sel: '[data-tour="w-next"]', t: "Verder", d: "Wijkt een keuze af, dan krijg je eerst een waarschuwing met de reden. Met Toch doorgaan ga je gewoon verder." },
    ] },
  };
  const seenKey = (n) => "adsweet-tour-" + n;
  const routeNow = () => (location.hash || "").replace(/^#\/?/, "").split("?")[0] || "vandaag";
  let tour = null;

  function visible(el) { if (!el) return false; const b = el.getBoundingClientRect(); return b.width > 2 && b.height > 2; }

  function start(name, opts) {
    const def = TOURS[name]; if (!def) return;
    opts = opts || {};
    if (!opts.force) { try { if (localStorage.getItem(seenKey(name))) return; } catch (e) {} }
    if (def.route && routeNow() !== def.route) { location.hash = "#" + def.route; setTimeout(() => start(name, Object.assign({}, opts, { force: true })), 650); return; }
    const steps = def.steps.map((s) => Object.assign({}, s, { el: s.sel ? document.querySelector(s.sel) : null })).filter((s) => !s.sel || visible(s.el));
    if (!steps.length) return;
    end(false);
    tour = { name, steps, i: 0, prevFocus: document.activeElement };
    build();
    go(0);
  }
  function build() {
    const L = getLayer();
    const root = document.createElement("div");
    root.setAttribute("data-tour-overlay", "");
    root.style.cssText = "position:fixed; inset:0; z-index:95; pointer-events:auto;";
    root.innerHTML =
      '<div data-hole style="position:fixed; border-radius:18px; box-shadow:0 0 0 3px rgba(241,239,234,.95), 0 0 0 9999px rgba(17,17,16,.66); pointer-events:none; transition:left 300ms ' + EASE + ', top 300ms ' + EASE + ', width 300ms ' + EASE + ', height 300ms ' + EASE + ';"></div>' +
      '<div data-card role="dialog" aria-modal="true" aria-labelledby="as-tour-t" style="position:fixed; width:min(360px, calc(100vw - 32px)); padding:20px; background:var(--surface, #F5F4F0); color:var(--ink, #151514); border:1px solid var(--line, rgba(21,21,20,.14)); border-radius:20px; box-shadow:0 16px 40px rgba(0,0,0,.28); display:flex; flex-direction:column; gap:10px; font-family:var(--font, \'Host Grotesk\', sans-serif); transition:left 300ms ' + EASE + ', top 300ms ' + EASE + ', opacity 200ms ease;"></div>';
    L.appendChild(root);
    tour.root = root; tour.hole = root.querySelector("[data-hole]"); tour.card = root.querySelector("[data-card]");
    tour.onKey = (e) => {
      if (!tour) return;
      if (e.key === "Escape") { e.preventDefault(); end(true); }
      else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === "Tab") {
        const f = Array.from(tour.card.querySelectorAll("button, a")); if (!f.length) return;
        const idx = f.indexOf(document.activeElement);
        e.preventDefault(); f[(idx + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    };
    tour.onMove = () => { if (tour && !tour.raf) tour.raf = requestAnimationFrame(() => { if (tour) { tour.raf = 0; place(); } }); };
    document.addEventListener("keydown", tour.onKey, true);
    window.addEventListener("resize", tour.onMove); window.addEventListener("scroll", tour.onMove, { passive: true });
  }
  function go(i) {
    if (!tour) return;
    tour.i = i;
    const st = tour.steps[i], n = tour.steps.length, last = i === n - 1;
    const color = CANDY[i % CANDY.length];
    const dots = tour.steps.map((_, j) => '<span style="height:7px; width:' + (j === i ? 20 : 7) + 'px; border-radius:999px; background:' + (j <= i ? CANDY[j % CANDY.length] : "var(--line-strong, #7A776F)") + '; opacity:' + (j <= i ? 1 : .35) + '; transition:width 300ms ' + EASE + ';"></span>').join("");
    const mood = last ? 'viert' : i === 0 ? 'blij' : i % 3 === 2 ? 'knipoog' : 'praat';
    tour.card.innerHTML =
      '<div style="display:flex; align-items:center; gap:12px;"><dot-karakter size="58" mood="' + mood + '"></dot-karakter><span style="flex:1;"></span>' +
      '<span style="align-self:center; height:26px; padding:0 11px; display:inline-flex; align-items:center; border-radius:999px; background:' + color + '; color:#151514; font-size:12.5px; font-weight:500; transform:rotate(-2deg);">Stap ' + (i + 1) + ' van ' + n + '</span></div>' +
      '<h2 id="as-tour-t" aria-live="polite" style="margin:2px 0 0; font-size:20px; font-weight:500; letter-spacing:-.02em; line-height:1.2;">' + esc(st.t) + '</h2>' +
      '<p style="margin:0; font-size:15px; line-height:1.5; color:var(--ink-muted, #5F5C56);">' + esc(st.d.replace("{n}", String(n))) + '</p>' +
      '<div aria-hidden="true" style="display:flex; align-items:center; gap:4px; padding-top:4px;">' + dots + '</div>' +
      '<div style="display:flex; align-items:center; gap:10px; padding-top:6px;">' +
        '<button type="button" data-skip style="padding:4px 0; border:0; border-bottom:1px solid var(--line-strong, #7A776F); background:none; color:var(--ink, #151514); font:inherit; font-size:14px; font-weight:500; cursor:pointer;">' + (last ? "Sluiten" : "Sla over") + '</button>' +
        '<span style="flex:1;"></span>' +
        (i > 0 ? '<button type="button" data-prev style="height:40px; padding:0 16px; border:1px solid var(--line-strong, #7A776F); border-radius:999px; background:transparent; color:var(--ink, #151514); font:inherit; font-size:14px; font-weight:500; cursor:pointer;">Vorige</button>' : "") +
        '<button type="button" data-next style="height:40px; padding:0 18px; border:0; border-radius:999px; background:var(--ink, #151514); color:var(--ground, #EAE8E3); font:inherit; font-size:14px; font-weight:500; cursor:pointer;">' + (last ? "Klaar" : "Volgende") + '</button>' +
      '</div>';
    tour.card.querySelector("[data-skip]").onclick = () => end(true);
    tour.card.querySelector("[data-next]").onclick = next;
    const pb = tour.card.querySelector("[data-prev]"); if (pb) pb.onclick = prev;
    const el = st.el && document.contains(st.el) ? st.el : st.sel ? document.querySelector(st.sel) : null; st.el = el;
    let wait = 0;
    if (el) {
      const b = el.getBoundingClientRect(), vh = innerHeight;
      const fixed = getComputedStyle(el).position === "fixed" || (el.closest && el.closest('[style*="position:fixed"], [style*="position: fixed"]'));
      if (!fixed && b.height < vh - 120 && (b.top < 80 || b.bottom > vh - 40)) {
        window.scrollTo({ top: window.scrollY + b.top - Math.max(90, (vh - b.height) / 3), behavior: reduce() ? "auto" : "smooth" });
        wait = reduce() ? 0 : 380;
      }
    }
    tour.card.style.opacity = "0";
    place();
    setTimeout(() => { if (!tour) return; place(); tour.card.style.opacity = "1"; const nb = tour.card.querySelector("[data-next]"); nb && nb.focus({ preventScroll: true }); }, wait);
  }
  function place() {
    if (!tour) return;
    const st = tour.steps[tour.i], vw = innerWidth, vh = innerHeight, card = tour.card, hole = tour.hole;
    const cw = Math.min(360, vw - 32), ch = card.offsetHeight || 220;
    let r = null;
    if (st.el && document.contains(st.el)) {
      const b = st.el.getBoundingClientRect(), pad = 8;
      const x = Math.max(6, b.left - pad), y = Math.max(6, b.top - pad);
      r = { x, y, w: Math.max(20, Math.min(b.right + pad, vw - 6) - x), h: Math.max(20, Math.min(b.bottom + pad, vh - 6) - y) };
    }
    if (r) {
      Object.assign(hole.style, { display: "block", left: r.x + "px", top: r.y + "px", width: r.w + "px", height: r.h + "px" });
      tour.root.style.background = "transparent";
    } else {
      hole.style.display = "none";
      tour.root.style.background = "rgba(17,17,16,.66)";
    }
    let left, top;
    const clampX = (v) => Math.min(Math.max(12, v), vw - cw - 12), clampY = (v) => Math.min(Math.max(12, v), vh - ch - 12);
    if (!r) { left = (vw - cw) / 2; top = (vh - ch) / 2; }
    else if (vw < 640) { left = 16; top = r.y + r.h / 2 < vh / 2 ? vh - ch - 16 : 16; }
    else if (r.y + r.h + 14 + ch < vh - 12) { top = r.y + r.h + 14; left = clampX(r.x); }
    else if (r.y - ch - 14 >= 12) { top = r.y - ch - 14; left = clampX(r.x); }
    else if (r.x + r.w + 14 + cw < vw - 12) { left = r.x + r.w + 14; top = clampY(r.y); }
    else if (r.x - cw - 14 >= 12) { left = r.x - cw - 14; top = clampY(r.y); }
    else { left = vw - cw - 16; top = vh - ch - 16; }
    card.style.left = left + "px"; card.style.top = top + "px";
  }
  function next() { if (!tour) return; if (tour.i >= tour.steps.length - 1) return end(true); go(tour.i + 1); }
  function prev() { if (!tour || tour.i === 0) return; go(tour.i - 1); }
  function end(markSeen) {
    if (!tour) return;
    const t = tour; tour = null;
    if (markSeen) { try { localStorage.setItem(seenKey(t.name), "1"); } catch (e) {} }
    document.removeEventListener("keydown", t.onKey, true);
    window.removeEventListener("resize", t.onMove); window.removeEventListener("scroll", t.onMove);
    t.root && t.root.remove();
    if (t.prevFocus && t.prevFocus.focus) { try { t.prevFocus.focus({ preventScroll: true }); } catch (e) {} }
  }
  function auto(route) {
    const name = Object.keys(TOURS).find((k) => TOURS[k].route === route);
    if (!name) return;
    if (name === "app" && !document.querySelector('[data-tour="greet"]')) return;
    start(name);
  }
  function reset() { Object.keys(TOURS).forEach((k) => { try { localStorage.removeItem(seenKey(k)); } catch (e) {} }); }

  /* ---------- Vakwoorden ---------- */
  const T = [
    ["break-even", "break-even(?:\\s+ROAS)?", "Break-even ROAS", "De ROAS waarboven je geld verdient aan je advertenties: 1 gedeeld door je marge.", "40% marge: 1 / 0,40 = 2,5.", "Bij aanvragen werk je met een doel per aanvraag. Jouw doel is €20."],
    ["doel-roas", "doel-ROAS", "Doel-ROAS", "Een ROAS die je zelf wil halen, hoger dan je break-even.", "Je gaf geen doel-ROAS op, dus telt je break-even van 2,5.", ""],
    ["roas", "ROAS", "ROAS", "Omzet gedeeld door wat je advertenties kostten.", "€638 / €280 = 2,28.", "Voor aanvragen kijkt AdSweet naar de kost per aanvraag, niet naar ROAS."],
    ["max-cpa", "maximale kost per verkoop", "Maximale kost per verkoop", "Orderwaarde × marge. Meer mag één verkoop niet kosten.", "€58 × 40% = €23,20.", ""],
    ["cpa", "kost per verkoop", "Kost per verkoop", "Wat één verkoop aan advertenties kostte.", "€280 / 11 = €25,45.", ""],
    ["cpl", "kost per aanvraag", "Kost per aanvraag", "Wat één aanvraag aan advertenties kostte.", "Voorbeeld van Tom: €210 / 9 = €23,33.", "€210 / 9 = €23,33. Je doel is €20."],
    ["cpc", "kost per klik", "Kost per klik", "Wat één klik op je advertentie kostte.", "", ""],
    ["ctr", "CTR", "CTR", "Hoeveel procent van wie je advertentie ziet, erop klikt.", "Je beste video: 1,4%, dus 14 op 1.000.", ""],
    ["freq", "frequentie", "Frequentie", "Hoe vaak iemand je advertentie gemiddeld zag.", "Je beste video: 2,8 keer.", ""],
    ["bereik", "bereik|vertoningen", "Bereik en vertoningen", "Bereik: hoeveel verschillende mensen je advertentie zagen. Vertoningen: hoe vaak ze in totaal getoond werd.", "", ""],
    ["leerfase", "leerfase", "Leerfase", "De eerste periode waarin Meta uitzoekt aan wie het je advertentie best toont. Resultaten schommelen dan. Daarom raken we lopende ad sets niet aan.", "", ""],
    ["adset", "ad ?sets?", "Ad set", "Een groep advertenties die naar dezelfde mensen gaat. De campagne is je doel en je budget, de advertentie is wat mensen zien.", "Je hebt 1 campagne, 1 ad set en 5 advertenties.", "Je hebt 1 campagne, 1 ad set en 5 advertenties."],
    ["funnel", "(?:top|middle|bottom)[- ]of[- ]funnel|funnel(?:fase|balk|verdeling)?", "Top, middle en bottom of funnel", "De drie fases van iemand die je nog niet kent tot iemand die koopt. Top: aandacht. Middle: uitleg en bewijs. Bottom: een aanbod en een duidelijke knop.", "De brandende kaars (top), hoe ze gegoten worden (middle), de geschenkdoos met prijs (bottom).", "Voor en na (top), een klant vertelt (middle), gratis dakinspectie (bottom)."],
    ["cbo", "budget op campagneniveau|Advantage-campagnebudget|campagnebudget", "Budget op campagneniveau", "Je budget staat op de campagne, en Meta verdeelt het zelf over wat het best loopt.", "", ""],
    ["plaatsing", "plaatsing(?:en)?", "Plaatsing", "Waar je advertentie verschijnt, zoals de feed, stories of reels.", "", ""],
    ["pixel", "pixel|dataset", "Pixel of dataset", "Een stukje code op je website dat aan Meta laat weten wie iets kocht of een formulier invulde.", "", ""],
    ["fatigue", "creative-vermoeidheid", "Creative-vermoeidheid", "Mensen hebben je advertentie te vaak gezien en klikken minder.", "Je beste video: CTR van 2,1% naar 1,4%.", ""],
    ["utm", "UTM(?:'s)?", "UTM", "Een label achter je link, zodat je in Google Analytics of Shopify ziet van welke advertentie een bezoeker kwam.", "utm_campaign=noor-vast-verkopen", ""],
    ["extras", "extra's van Meta|Advantage\\+(?: creative)?", "Extra's van Meta", "Aanpassingen die Meta zelf aan je advertentie doet, zoals muziek of tekst op je beeld. Bij AdSweet staan ze uit.", "", ""],
    ["cta", "call-to-action", "Call-to-action", "De knop onder je advertentie, zoals Nu kopen of Afspraak maken.", "", ""],
    ["hook", "hooks?", "Hook", "De eerste zin of seconde van je advertentie, die mensen doet stoppen met scrollen.", "", ""],
    ["interesses", "interesses", "Interesses", "Doelgroepen op basis van wat mensen leuk vinden. AdSweet gebruikt ze niet: ze maken je doelgroep kleiner zonder dat het beter werkt.", "", ""],
    ["breed", "breed adverteren", "Breed adverteren", "Je kiest alleen regio, taal en leeftijd. Meta zoekt zelf wie je advertentie wil zien.", "", ""],
    ["orderwaarde", "(?:gemiddelde )?orderwaarde", "Orderwaarde", "Wat een klant gemiddeld per bestelling uitgeeft.", "€58 per bestelling.", ""],
    ["marge", "(?:bruto)?marge", "Brutomarge", "Wat je overhoudt van een verkoop na de kost van je product, in procent.", "40%: van €58 hou je €23,20 over.", "25% van wat een klant je opbrengt."],
    ["cpm", "CPM", "CPM", "Wat 1.000 vertoningen van je advertentie kostten.", "€280 / 36.800 × 1.000 = €7,61.", ""],
    ["hook", "hook rate", "Hook rate", "Hoeveel procent van wie je video ziet, de eerste 3 seconden blijft kijken.", "24,6%.", ""],
    ["hold", "hold rate", "Hold rate", "Hoeveel procent je video bijna helemaal uitkijkt.", "", ""],
    ["thumb", "thumb-stop", "Thumb-stop", "Hoeveel procent stopt met scrollen bij je advertentie.", "", ""],
    ["lpv", "landingpaginaweergaven|landingsratio", "Landingpaginaweergaven", "Hoeveel mensen na een klik je pagina echt zagen laden. De ratio toont hoeveel klikken aankomen.", "331 van 412 klikken: 80,3%.", ""],
    ["credits", "credits?", "Credits", "Daarmee maakt AdSweet beelden, teksten en scripts voor je. Pro heeft er 300 per maand, Scale 600, Agency 1.500.", "", ""],
  ];
  const RE = new RegExp("(?<![\\p{L}\\d])(?:" + T.map((t) => "(" + t[1] + ")").join("|") + ")(?![\\p{L}\\d])", "giu");
  const SKIP = 'button, a, input, textarea, select, option, script, style, svg, h1, nav, [data-no-terms], [role="tooltip"], #as-layer, [aria-hidden="true"], [contenteditable]';
  let entries = new Map(), allRanges = [], scanT = 0, tip = null, tipFor = null, hideT = 0;
  const hasHL = !!(window.CSS && CSS.highlights && window.Highlight);
  function okParent(el) {
    if (!el || el.closest(SKIP)) return false;
    for (let p = el, k = 0; p && k < 3; p = p.parentElement, k++) { const bb = p.style && p.style.borderBottom; if (bb && bb.indexOf("dotted") >= 0) return false; }
    return true;
  }
  function scan() {
    entries = new Map(); allRanges = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.nodeValue && n.nodeValue.trim().length > 1 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
    let n, count = 0;
    while ((n = walker.nextNode()) && count < 4000) {
      if (!okParent(n.parentElement)) continue;
      RE.lastIndex = 0; let m; const list = [];
      while ((m = RE.exec(n.nodeValue))) {
        let gi = 1; while (gi < m.length && m[gi] === undefined) gi++;
        const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
        list.push({ s: m.index, e: m.index + m[0].length, k: gi - 1, r }); allRanges.push(r); count++;
      }
      if (list.length) entries.set(n, list);
    }
    if (hasHL) { try { CSS.highlights.set("as-term", new Highlight(...allRanges)); } catch (e) {} }
  }
  function scheduleScan() { clearTimeout(scanT); scanT = setTimeout(scan, 300); }
  function scenario() { try { return (JSON.parse(localStorage.getItem("adsweet-demo") || "{}").scenario) || "lisa"; } catch (e) { return "lisa"; } }
  function glossary() { return /Website/.test(location.pathname) ? "#begrippen" : /Inloggen|Onboarding/.test(location.pathname) ? "Website.dc.html#begrippen" : "App.dc.html#begrippen"; }
  function caretAt(x, y) {
    if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); return p ? { node: p.offsetNode, off: p.offset } : null; }
    if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); return r ? { node: r.startContainer, off: r.startOffset } : null; }
    return null;
  }
  function hit(x, y) {
    const c = caretAt(x, y); if (!c) return null;
    const list = entries.get(c.node); if (!list) return null;
    for (const en of list) {
      if (c.off < en.s || c.off > en.e) continue;
      for (const rc of en.r.getClientRects()) if (x >= rc.left - 2 && x <= rc.right + 2 && y >= rc.top - 2 && y <= rc.bottom + 2) return en;
    }
    return null;
  }
  function showTip(en) {
    if (tipFor === en) { clearTimeout(hideT); return; }
    tipFor = en; clearTimeout(hideT);
    const [, , title, def, exL, exT] = T[en.k];
    const sc = scenario(); const ex = sc === "tom" ? exT : exL;
    const exLabel = sc === "lisa" || sc === "tom" ? "In jouw cijfers" : "Voorbeeld";
    if (!tip) {
      tip = document.createElement("div"); tip.setAttribute("role", "tooltip"); tip.id = "as-term-tip";
      tip.style.cssText = "position:fixed; z-index:96; width:min(300px, calc(100vw - 24px)); padding:14px 16px; background:var(--surface, #F5F4F0); color:var(--ink, #151514); border:1px solid var(--line, rgba(21,21,20,.14)); border-radius:16px; box-shadow:var(--shadow-float, 0 12px 32px rgba(21,21,20,.12)); display:flex; flex-direction:column; gap:6px; font-family:var(--font, 'Host Grotesk', sans-serif); font-size:13.5px; line-height:1.45; letter-spacing:-.01em; transition:opacity 150ms ease; opacity:0;";
      tip.addEventListener("pointerenter", () => clearTimeout(hideT));
      tip.addEventListener("pointerleave", () => scheduleHide());
      getLayer().appendChild(tip);
    }
    tip.innerHTML = '<span style="display:flex; align-items:center; gap:8px;"><span style="width:8px; height:8px; border-radius:50%; background:' + CANDY[en.k % CANDY.length] + ';"></span><b style="font-weight:500; font-size:15px;">' + esc(title) + '</b></span>' +
      '<span>' + esc(def) + '</span>' + (ex ? '<span><b style="font-weight:500;">' + exLabel + ':</b> ' + esc(ex) + '</span>' : "") +
      '<a href="' + glossary() + '" style="align-self:flex-start; margin-top:2px; color:var(--ink, #151514); font-weight:500; text-decoration:none; border-bottom:1px solid var(--line-strong, #7A776F);">Meer in de begrippenlijst</a>';
    const rc = en.r.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
    tip.style.opacity = "0"; tip.style.display = "flex";
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let top = rc.bottom + 8; if (top + th > vh - 8) top = Math.max(8, rc.top - th - 8);
    const left = Math.min(Math.max(8, rc.left), vw - tw - 8);
    tip.style.left = left + "px"; tip.style.top = top + "px";
    requestAnimationFrame(() => { if (tip) tip.style.opacity = "1"; });
  }
  function scheduleHide() { clearTimeout(hideT); hideT = setTimeout(() => { if (tip) { tip.style.opacity = "0"; tip.style.display = "none"; } tipFor = null; }, 180); }
  let mvRaf = 0, lastPt = null;
  function onMove(e) {
    if (e.pointerType === "touch" || tour) return;
    lastPt = [e.clientX, e.clientY];
    if (mvRaf) return;
    mvRaf = requestAnimationFrame(() => {
      mvRaf = 0; if (!lastPt) return;
      if (tip && tip.contains(document.elementFromPoint(lastPt[0], lastPt[1]))) return;
      const en = hit(lastPt[0], lastPt[1]);
      document.documentElement.style.cursor = en ? "help" : "";
      if (en) showTip(en); else if (tipFor) scheduleHide();
    });
  }
  function onTap(e) {
    if (tour) return;
    if (tip && tip.contains(e.target)) return;
    const en = hit(e.clientX, e.clientY);
    if (en) showTip(en); else if (tipFor) scheduleHide();
  }
  function initTerms() {
    scan();
    new MutationObserver((ms) => { for (const m of ms) { const t = m.target.nodeType === 1 ? m.target : m.target.parentElement; if (!t || !t.closest || !t.closest("#as-layer")) { scheduleScan(); return; } } })
      .observe(document.body, { subtree: true, childList: true, characterData: true });
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("click", onTap, true);
    window.addEventListener("scroll", () => { if (tipFor) scheduleHide(); }, { passive: true });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && tipFor) scheduleHide(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initTerms); else setTimeout(initTerms, 300);

  window.AdSweetTour = { start, auto, reset, end: () => end(true), rescanTerms: scan };
})();
