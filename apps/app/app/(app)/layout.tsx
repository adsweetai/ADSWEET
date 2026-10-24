import { AppShell } from "@/components/shell/AppShell";
import { getContext } from "@/lib/server/context";
import { currentPeriod } from "@/lib/server/period";
import { loadShell } from "@/lib/server/shell";
import "./shell.css";

// Alles onder (app) vraagt een ingelogde gebruiker. getContext stuurt anders door naar /inloggen.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getContext();
  const [shell, period] = await Promise.all([loadShell(ctx), currentPeriod()]);
  return (
    <AppShell shell={shell} period={period}>
      {children}
    </AppShell>
  );
}
