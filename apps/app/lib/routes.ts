import type { IconName } from "@adsweet/ui";

// Alle schermen van de app: pad, titel (messages: routes.*), label voor het schermoverzicht en de navigatiegroep.

export type FeatureLabel = "MVP" | "V1" | "Later";
export type NavId =
  | "klanten"
  | "vandaag"
  | "campagnes"
  | "advertenties"
  | "studio"
  | "concurrenten"
  | "inzichten"
  | "autopilot"
  | "academy"
  | "hulp"
  | "instellingen"
  | "meldingen"
  | "logboek";

export interface RouteInfo {
  id: string;
  /** Sleutel in messages/routes */
  title: string;
  label: FeatureLabel;
  group: NavId;
  /** Toont de periodekiezer in de bovenbalk. */
  period?: boolean;
}

const R = (id: string, label: FeatureLabel, group: NavId, period = false, title = id): RouteInfo => ({ id, title, label, group, period });

/** Van specifiek naar algemeen: de eerste die past, wint. */
const TABLE: [RegExp, RouteInfo][] = [
  [/^\/vandaag/, R("vandaag", "MVP", "vandaag", true)],
  [/^\/klanten/, R("klanten", "MVP", "klanten")],
  [/^\/meldingen/, R("meldingen", "MVP", "vandaag")],
  [/^\/logboek/, R("logboek", "V1", "vandaag")],
  [/^\/campagnes\/nieuw/, R("campagneNieuw", "MVP", "campagnes")],
  [/^\/campagnes\/[^/]+\/delen/, R("previewLink", "V1", "campagnes")],
  [/^\/campagnes\/[^/]+/, R("campagne", "MVP", "campagnes", true)],
  [/^\/campagnes/, R("campagnes", "MVP", "campagnes", true)],
  [/^\/advertenties\/toevoegen/, R("advertentiesToevoegen", "MVP", "campagnes")],
  [/^\/advertenties\/maken/, R("advertentieMaken", "MVP", "campagnes")],
  [/^\/advertenties/, R("advertenties", "MVP", "advertenties", true)],
  [/^\/bulk/, R("bulk", "MVP", "campagnes")],
  [/^\/testgrid/, R("testgrid", "V1", "advertenties")],
  [/^\/google/, R("google", "V1", "campagnes")],
  [/^\/catalogus/, R("catalogus", "Later", "advertenties")],
  [/^\/studio/, R("studio", "MVP", "studio")],
  [/^\/concurrenten/, R("concurrenten", "V1", "concurrenten")],
  [/^\/inzichten/, R("inzichten", "MVP", "inzichten", true)],
  [/^\/weekrapport/, R("weekrapport", "MVP", "inzichten")],
  [/^\/autopilot/, R("autopilot", "V1", "autopilot")],
  [/^\/academy\/[^/]+/, R("les", "MVP", "academy")],
  [/^\/academy/, R("academy", "MVP", "academy")],
  [/^\/begrippen/, R("begrippen", "MVP", "academy")],
  [/^\/certificaat/, R("certificaat", "V1", "academy")],
  [/^\/hulp/, R("hulp", "MVP", "hulp")],
  [/^\/instellingen\/accounts/, R("instellingen", "V1", "instellingen")],
  [/^\/instellingen\/ontwikkelaars/, R("instellingen", "Later", "instellingen")],
  [/^\/instellingen/, R("instellingen", "MVP", "instellingen")],
  [/^\/abonnement/, R("abonnement", "MVP", "instellingen")],
  [/^\/team/, R("team", "V1", "instellingen")],
  [/^\/doorverwijzen/, R("doorverwijzen", "MVP", "instellingen")],
  [/^\/partner/, R("partner", "Later", "instellingen")],
  [/^\/mails/, R("mails", "MVP", "instellingen")],
];

export function routeInfo(pathname: string): RouteInfo {
  for (const [re, info] of TABLE) if (re.test(pathname)) return info;
  return R("vandaag", "MVP", "vandaag", true);
}

export interface NavItem {
  id: NavId;
  href: string;
  icon: IconName;
  /** Vanaf welk plan het scherm open is. */
  min?: "pro" | "scale" | "agency";
}

export const NAV_MAIN: NavItem[] = [
  { id: "vandaag", href: "/vandaag", icon: "today" },
  { id: "campagnes", href: "/campagnes", icon: "layers" },
  { id: "advertenties", href: "/advertenties", icon: "image" },
  { id: "studio", href: "/studio", icon: "wand", min: "pro" },
  { id: "concurrenten", href: "/concurrenten", icon: "eye", min: "pro" },
  { id: "inzichten", href: "/inzichten", icon: "chart" },
  { id: "autopilot", href: "/autopilot", icon: "sliders" },
  { id: "academy", href: "/academy", icon: "book" },
];
/** Op slot tot de onboarding af is: deze schermen hebben je zaak, je doelen of je advertentieaccount nodig. */
export const NEEDS_ONBOARDING = new Set(["campagnes", "advertenties", "studio", "concurrenten", "inzichten", "autopilot", "nieuw"]);

export const NAV_CLIENTS: NavItem = { id: "klanten", href: "/klanten", icon: "users" };
export const NAV_EXTRA_MOBILE: NavItem[] = [
  { id: "meldingen", href: "/meldingen", icon: "bell" },
  { id: "logboek", href: "/logboek", icon: "undo" },
];
export const NAV_BOTTOM: NavItem[] = [
  { id: "hulp", href: "/hulp", icon: "help" },
  { id: "instellingen", href: "/instellingen/profiel", icon: "gear" },
];

export const SETTINGS_PAGES = [
  "profiel",
  "cijfers",
  "koppelingen",
  "accounts",
  "naamgeving",
  "betaler",
  "meldingen",
  "taal",
  "team",
  "abonnement",
  "doorverwijzen",
  "privacy",
  "playbook",
  "ontwikkelaars",
] as const;
export type SettingsPage = (typeof SETTINGS_PAGES)[number];
