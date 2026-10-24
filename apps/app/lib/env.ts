// Publieke instellingen. Geheime sleutels (Meta, Claude, betalingen) staan nooit hier: zie lib/server/secrets.ts.

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  appUrl: (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  /** De website (Website.dc.html): verwerkersovereenkomst, Done With You en de doorverwijslinks /r/[code]. */
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://adsweet.ai").replace(/\/$/, ""),
};

/**
 * Zonder Supabase-sleutels draait de app in demomodus: een Postgres in het proces met hetzelfde schema,
 * dezelfde rechten en de voorbeelddata van Lisa, Tom, Sarah, Bram en Eva. Er gaan geen echte mails uit.
 */
export const isDemo = !env.supabaseUrl || !env.supabaseAnonKey;
