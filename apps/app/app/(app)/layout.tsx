import { getContext } from "@/lib/server/context";

// Alles onder (app) vraagt een ingelogde gebruiker. getContext stuurt anders door naar /inloggen.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await getContext();
  return <>{children}</>;
}
