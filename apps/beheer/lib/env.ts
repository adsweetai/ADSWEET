// Publieke instellingen van Beheer. Geheime sleutels staan nooit hier en nooit met NEXT_PUBLIC_.

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  beheerUrl: (process.env.NEXT_PUBLIC_BEHEER_URL ?? "http://localhost:3001").replace(/\/$/, ""),
};

/**
 * Zonder Supabase-sleutels draait Beheer in demomodus: een eigen Postgres in het proces met hetzelfde schema en
 * dezelfde voorbeelddata als de app. Let op: de app heeft dan zijn eigen demodatabase. Met Supabase delen ze er één.
 */
export const isDemo = !env.supabaseUrl || !env.supabaseAnonKey;
