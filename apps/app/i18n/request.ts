import { getRequestConfig } from "next-intl/server";

// Alleen Nederlands in deze versie. FR en EN komen later als messages/fr.json en messages/en.json.
export const LOCALE = "nl";
export const TIME_ZONE = "Europe/Brussels";

export default getRequestConfig(async () => ({
  locale: LOCALE,
  timeZone: TIME_ZONE,
  messages: (await import(`../messages/${LOCALE}.json`)).default,
}));
