import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Logo } from "@adsweet/ui";
import { currentUser, isAdmin } from "@/lib/server/auth";

// Ingelogd, maar geen adsweet_admin: niets van Beheer te zien.
export default async function NoAccessPage() {
  const user = await currentUser();
  if (!user) redirect("/inloggen");
  if (await isAdmin(user)) redirect("/playbook");
  const t = await getTranslations("login");
  const tc = await getTranslations("common");
  return (
    <main className="bh-login">
      <div className="bh-login__card">
        <span className="bh-brand" style={{ padding: 0 }}>
          <Logo alt={tc("logoAlt")} />
          <span className="bh-tag">{tc("tag")}</span>
        </span>
        <h1>{t("noAccessTitle")}</h1>
        <p>{t("noAccessText", { email: user.email })}</p>
        <form action="/auth/uitloggen" method="post">
          <button type="submit" className="as-textbtn">
            {tc("logout")}
          </button>
        </form>
      </div>
    </main>
  );
}
