import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Avatar } from "@adsweet/ui";
import { FacebookButton } from "@/components/auth/FacebookButton";
import { isDemo } from "@/lib/env";
import { loadInvitation } from "@/lib/server/invitations";
import { inviteMailAction } from "../../actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("inviteMeta"), robots: { index: false, follow: false } };
}

/** Uitnodiging van een teamlid (Inloggen.dc.html#uitnodiging). */
export default async function InvitePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ fout?: string }> }) {
  const { token } = await params;
  const sp = await searchParams;
  const t = await getTranslations("auth");
  const tm = await getTranslations("metaWindow");
  const inv = await loadInvitation(token);
  if (!inv?.valid)
    return (
      <>
        <h1 className="au-title au-title--sm">{t("inviteInvalid")}</h1>
        <Link className="au-link" href="/inloggen">
          {t("loginLink")}
        </Link>
      </>
    );
  const mail = inviteMailAction.bind(null, token);
  return (
    <>
      <span className="au-chip au-chip--person">
        <Avatar initial={inv.inviter.slice(0, 1).toUpperCase()} color="roos" size={22} />
        {inv.inviter} · {inv.orgName}
      </span>
      <h1 className="au-title au-title--sm">{t("inviteTitle", { name: inv.inviter, org: inv.orgName })}</h1>
      <p className="au-text">{t(`inviteRole.${inv.role}`)}</p>
      {sp.fout === "perm" || sp.fout === "noacc" || sp.fout === "expired" ? (
        <p className="au-error" role="alert">
          {tm(`errors.${sp.fout}`)}
        </p>
      ) : null}
      <FacebookButton context="invite" token={token} demo={isDemo} next={`/uitnodiging/${token}/aanvaarden`} />
      <form action={mail}>
        <button type="submit" className="au-secondary au-secondary--block">
          {t("inviteMail")}
        </button>
      </form>
    </>
  );
}
