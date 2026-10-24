import { Sidebar } from "@/components/Sidebar";
import { requireAdmin } from "@/lib/server/auth";
import { Toasts } from "@/components/Toasts";

// Alles in Beheer: alleen voor adsweet_admin. De controle gebeurt hier en nog eens in elke actie op de server.
export default async function BeheerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <Toasts>
      <div className="bh">
        <Sidebar email={user.email} />
        <main className="bh-main">{children}</main>
      </div>
    </Toasts>
  );
}
