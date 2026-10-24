import type { MailData, MailKind } from "./mails";

// De voorbeelden uit Mails.dc.html, voor de voorvertoning en de testverzending. Plaatshouders blijven plaatshouders.

export const SAMPLES: { [K in MailKind]: MailData[K] } = {
  welkom: { name: "Sarah" },
  login: { url: "https://app.adsweet.ai/auth/callback?voorbeeld=1" },
  uitnodiging: { inviter: "Lisa", org: "Atelier Noor", role: "beheerder", url: "https://app.adsweet.ai/uitnodiging/voorbeeld" },
  proefBijnaOm: { name: "Lisa", days: 3, date: "16 december", price: "€136,50", vat: "€28,67", total: "€165,17", plan: "Pro", founding: true },
  proefOmgezet: { plan: "Pro", price: "€136,50" },
  factuur: {
    date: "[datum]",
    plan: "Pro",
    founding: true,
    price: "€136,50",
    vat: "€28,67",
    total: "€165,17",
    method: "[betaalmethode]",
    url: "https://app.adsweet.ai/abonnement",
  },
  betalingMislukt: { total: "€165,17" },
  weekrapport: {
    name: "Tom",
    kind: "leads",
    spend: "€105",
    n: 5,
    value: "€21,00",
    target: "€20",
    prev: { n: 4, value: "€26,25" },
    best: "Voor en na",
    worst: { name: "Ons team aan het werk", spend: "€60" },
    week: "2026-11-30",
  },
  actieNodig: {
    name: "Lisa",
    subject: "‘Sfeerbeeld woonkamer’",
    title: "‘Sfeerbeeld woonkamer’ gaf €72 uit zonder verkoop.",
    body: [
      "Je maximale kost per verkoop is €23,20. Drie keer dat is €69,60, en die grens is voorbij.",
      "Misschien moet je hem stilaan afzetten. Dat doe je met één klik op Vandaag.",
    ],
  },
  kwartaalcall: { date: "[datum]", time: "[uur]" },
  doorverwijzing: { name: "[naam]", date: "[datum]" },
  opgezegd: { date: "[einde periode]" },
};
