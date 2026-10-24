import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { routeMetadata } from "@/lib/meta";
import { loadLesson } from "@/lib/server/academy";
import { getContext } from "@/lib/server/context";
import { MarkRead, Quiz } from "../Lesson";
import "../academy.css";

export const generateMetadata = routeMetadata("les");

// Een les (App.dc.html#les): tekst, plaats voor een video, wat het betekent in jouw account en een controlevraag.
export default async function LessonPage({ params }: { params: Promise<{ les: string }> }) {
  const { les } = await params;
  const ctx = await getContext();
  const vm = await loadLesson(ctx, les);
  if (!vm) notFound();
  const t = await getTranslations("academy");
  return (
    <article className="ls">
      <Link href="/academy" className="ls-back">
        {t("back", { n: vm.track.n, track: vm.track.title })}
      </Link>
      <header className="ls-head">
        <span className="ls-concept">{t("concept")}</span>
        <h2>{vm.title}</h2>
        <span className="as-muted">{t("of", { n: vm.index + 1, total: vm.total, min: 4 })}</span>
      </header>
      <div className="ls-body">
        {vm.content ? (
          <>
            <p className="ls-lead">{vm.content.lead}</p>
            {vm.content.paras.map(([b, rest]) => (
              <p key={b}>
                <b>{b}</b> {rest}
              </p>
            ))}
          </>
        ) : (
          <p className="as-muted">{t("contentPlaceholder")}</p>
        )}
      </div>
      <div className="ls-video as-hatch" aria-label={t("videoAria")} role="img">
        {t("video")}
      </div>
      <section className="ls-account">
        <b>{t("inAccountTitle")}</b>
        <span>{vm.inAccount.text}</span>
        <Link href={vm.inAccount.href} className="ls-do">
          {vm.inAccount.btn}
        </Link>
      </section>
      {vm.quiz ? <Quiz lesson={vm.id} quiz={vm.quiz} /> : null}
      <MarkRead lesson={vm.id} next={vm.next} read={vm.read} />
    </article>
  );
}
