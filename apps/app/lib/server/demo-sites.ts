import "server-only";
import type { FunnelPhase } from "@adsweet/db";

// Voorbeelddata voor de demo (Inloggen.dc.html en Onboardingpaneel.dc.html): wat AdSweet vindt op de websites van
// Sarah (salonmila.voorbeeld) en Lisa (ateliernoor.voorbeeld). Net als de seed is dit data, geen schermtekst.

export interface Brief {
  phase: FunnelPhase;
  kind: "foto" | "video";
  what: string;
  why: string;
  first: string;
}

export interface DemoSite {
  found: {
    name: string;
    logo: string;
    colors: string[];
    sells: string;
    sellsSub: string | null;
    offers: { name: string; price: string }[];
    tone: string[];
    toneExample: string | null;
    images: string[];
    imageCount: number;
    contact: string;
    region: string | null;
  };
  briefs: Brief[];
  moments: string[];
  headline: string;
  budget: number;
  /** Voorgevulde cijfers (C3): Lisa €58 en 40%, Sarah €15 met klantwaarde €360, 50% en 1 op 4. */
  numbers: { aov: string; margin: string; cpl: string; clv: string; lmargin: string; chance: string };
  toneSamples: Record<string, string>;
  /** Voorbeeldresultaten van Studio (App.dc.html, pvSmart). */
  studio?: { context: string[]; beeld: string[]; tekst: string[]; hooks: string[]; script: string[] };
  /** Creative-strateeg en wat opvalt bij concurrenten (voorbeeld met verzonnen namen). */
  competitors?: {
    notes: string[];
    personas: { name: string; initial: string; color: "roos" | "tarwe" | "salie"; text: string; phases: [string, string, string][] }[];
  };
  sayYes: string;
  sayNo: string;
}

export const DEMO_SITES: Record<string, DemoSite> = {
  "salonmila.voorbeeld": {
    found: {
      name: "Salon Mila",
      logo: "M",
      colors: ["#3D4A3F", "#E8DCCB"],
      sells: "Knippen dames €48 · Kleuren vanaf €75 · Balayage vanaf €120",
      sellsSub: null,
      offers: [
        { name: "Knippen dames", price: "€48" },
        { name: "Kleuren", price: "vanaf €75" },
        { name: "Balayage", price: "vanaf €120" },
      ],
      tone: ["warm", "persoonlijk", "rustig"],
      toneExample: "Bij ons neem je even de tijd voor jezelf.",
      images: [],
      imageCount: 9,
      contact: "Hasselt · [adres] · [telefoon]",
      region: "Hasselt",
    },
    briefs: [
      {
        phase: "top",
        kind: "foto",
        what: "Een balayage van dichtbij, in daglicht.",
        why: "Valt op in de feed en toont meteen wat je doet.",
        first: "Zo ziet een balayage eruit die mooi uitgroeit.",
      },
      {
        phase: "top",
        kind: "video",
        what: "Een knipbeurt van begin tot eind, versneld tot 15 seconden.",
        why: "Video wordt langer bekeken en het playbook start met 2 video’s.",
        first: "Van lang naar fris in 15 seconden.",
      },
      {
        phase: "middle",
        kind: "foto",
        what: "Het salon zelf: de stoelen, het licht, de koffie.",
        why: "Wie twijfelt, wil weten waar ze binnenstapt.",
        first: "Even tijd voor jezelf, in het centrum van Hasselt.",
      },
      {
        phase: "middle",
        kind: "video",
        what: "Een vaste klant vertelt in een paar zinnen waarom ze terugkomt.",
        why: "Wat een ander zegt, overtuigt meer dan je eigen woorden.",
        first: "[eerste zin uit wat je klant zegt]",
      },
      {
        phase: "bottom",
        kind: "foto",
        what: "Je prijzen naast elkaar, met een duidelijke knop.",
        why: "Wie klaar is om te boeken, wil weten wat het kost.",
        first: "Knippen dames €48. Boek je moment online.",
      },
    ],
    moments: ["Feestdagen, vanaf half december: cadeaubonnen, in een aparte campagne.", "Begin januari: een nieuwe start, ook voor je haar."],
    headline: "Salon Mila, Hasselt",
    budget: 10,
    numbers: { aov: "", margin: "", cpl: "15", clv: "€360", lmargin: "50%", chance: "1 op 4" },
    toneSamples: { warm: "Bij ons neem je even de tijd voor jezelf." },
    sayYes: "",
    sayNo: "",
  },
  "ateliernoor.voorbeeld": {
    found: {
      name: "Atelier Noor",
      logo: "N",
      colors: ["#3A2E2A", "#EDE3D6", "#C9A27E", "#7E8B6F"],
      sells: "Handgemaakte kaarsen en geschenkdozen",
      sellsSub: "Gemiddeld €58 per bestelling",
      offers: [
        { name: "Geurkaars groot", price: "[prijs]" },
        { name: "Geurkaars klein", price: "[prijs]" },
        { name: "Geschenkdoos", price: "[prijs]" },
      ],
      tone: ["warm", "ambachtelijk", "rustig"],
      toneExample: "Elke kaars gieten we met de hand.",
      images: [],
      imageCount: 9,
      contact: "België · [adres]",
      region: "België",
    },
    briefs: [
      {
        phase: "top",
        kind: "video",
        what: "Een kaars wordt aangestoken, van dichtbij.",
        why: "De eerste seconde trekt de aandacht, en video wordt langer bekeken.",
        first: "Zo begint een rustige avond.",
      },
      {
        phase: "middle",
        kind: "video",
        what: "Hoe jullie de kaarsen gieten, in 15 seconden.",
        why: "Wie twijfelt, wil zien dat het echt handwerk is.",
        first: "Elke kaars gieten we met de hand.",
      },
      {
        phase: "bottom",
        kind: "foto",
        what: "De geschenkdoos met de prijs erbij.",
        why: "Wie klaar is om te kopen, wil weten wat het kost.",
        first: "Een geschenk dat blijft branden.",
      },
      {
        phase: "top",
        kind: "foto",
        what: "Een kaars in een woonkamer, zonder tekst.",
        why: "Toont hoe het product in een interieur staat.",
        first: "Licht dat bij je thuis past.",
      },
      {
        phase: "middle",
        kind: "foto",
        what: "Een review van een klant, als beeld.",
        why: "Wat een ander zegt, overtuigt meer dan je eigen woorden.",
        first: "[zin uit een echte review]",
      },
    ],
    moments: ["Feestdagen, 8 tot en met 24 december: je geschenkdozen, in een aparte campagne.", "Solden in januari."],
    headline: "Handgemaakte kaarsen",
    budget: 40,
    numbers: { aov: "€58", margin: "40%", cpl: "", clv: "", lmargin: "", chance: "" },
    toneSamples: {
      warm: "Een geschenk dat blijft branden.",
      speels: "Licht aan, zorgen uit.",
      luxueus: "Een avond in kaarslicht, met de hand gegoten.",
      direct: "Handgemaakte kaarsen. Bestel voor vrijdag, in huis voor het weekend.",
      grappig: "Je partner zegt dat je genoeg kaarsen hebt. Wij niet.",
    },
    sayYes: "handgemaakt, atelier, geschenk",
    sayNo: "goedkoop, uitverkoop, wauw",
    studio: {
      context: ["Product: geschenkdoos", "Fase die je mist: bottom of funnel", "Toon: warm, ambachtelijk, rustig"],
      beeld: [
        "AI-beeld 4:5 · de geschenkdoos op een houten tafel, zacht licht, zonder tekst",
        "AI-beeld 9:16 · dezelfde doos van boven, voor Stories",
        "AI-beeld 1:1 · drie kaarsen naast de doos",
      ],
      tekst: [
        "Een geschenk dat blijft branden. Elke doos stellen we met de hand samen.",
        "Drie kaarsen, één doos, klaar om te geven.",
        "Geef iets dat elke avond een beetje gezelliger maakt.",
      ],
      hooks: ["Een cadeau dat niet in de kast belandt.", "Geef licht, geen gadget.", "Wat geef je iemand die alles al heeft?"],
      script: [
        [
          "Video, 15 seconden, bottom of funnel",
          "0 tot 2 s: de doos gaat open, de kaars brandt al.",
          "2 tot 8 s: handen nemen de kaars eruit, close-up van het label.",
          "8 tot 13 s: de doos op tafel, met de prijs in beeld.",
          "13 tot 15 s: “Bestel voor [datum], op tijd onder de boom.”",
        ].join("\n"),
      ],
    },
    competitors: {
      notes: [
        "Concurrent A toont vooral hoe het product gemaakt wordt, in video.",
        "Twee van de drie werken met gratis verzending vanaf een bedrag.",
        "Wat lang loopt, toont het product in gebruik, niet op een witte achtergrond.",
      ],
      personas: [
        {
          name: "De cadeaugever",
          initial: "G",
          color: "roos",
          text: "Zoekt een geschenk dat persoonlijk aanvoelt, vooral in december.",
          phases: [
            ["top", "Een cadeau dat niet in de kast belandt.", "Wat geef je iemand die alles al heeft?"],
            ["middle", "Handgemaakt, mooi verpakt, op tijd geleverd.", "Zo stellen we je doos samen."],
            ["bottom", "Bestel nu, het ligt op tijd onder de boom.", "Nog 10 dagen om te bestellen."],
          ],
        },
        {
          name: "De sfeermaker",
          initial: "S",
          color: "tarwe",
          text: "Koopt voor zichzelf, voor rustige avonden thuis.",
          phases: [
            ["top", "Licht dat bij je thuis past.", "Zo begint een rustige avond."],
            ["middle", "Zachte geuren, lange brandtijd.", "Waarom handgegoten anders brandt."],
            ["bottom", "Je favoriete geur, opnieuw in huis.", "Bestel je vaste kaars."],
          ],
        },
        {
          name: "De bewuste koper",
          initial: "B",
          color: "salie",
          text: "Wil weten waar en hoe iets gemaakt wordt.",
          phases: [
            ["top", "Elke kaars gieten we met de hand.", "Dit is ons atelier."],
            ["middle", "Wat erin zit, en wat niet.", "Zo gieten we ze."],
            ["bottom", "Lokaal gemaakt, in België geleverd.", "Kies je kaars."],
          ],
        },
      ],
    },
  },
};

export const demoSiteOf = (site: string | null | undefined) => (site ? (DEMO_SITES[site.toLowerCase().split("/")[0]] ?? null) : null);
