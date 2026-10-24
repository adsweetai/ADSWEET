import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Icon } from "@adsweet/ui";
import { routeMetadata } from "@/lib/meta";
import { loadTracks } from "@/lib/server/academy";
import { getContext } from "@/lib/server/context";
import "./academy.css";

export const generateMetadata = routeMetadata("academy");

// Academy (App.dc.html#academy): vijf trajecten, je voortgang per traject en de lessen.
export default async function AcademyPage() {
  const ctx = await getContext();
  const tracks = await loadTracks(ctx);
  const t = await getTranslations("academy");
  return (
    <div className="ac">
      <div className="ac-links">
        <Link href="/begrippen" className="ac-pill">
          {t("glossaryLink")}
        </Link>
        <Link href="/certificaat" className="ac-pill">
          {t("certsLink")}
        </Link>
      </div>
      <ol className="ac-tracks">
        {tracks.map((tr) => {
          const pct = Math.round((tr.done / tr.lessons.length) * 100);
          return (
            <li key={tr.key} className="ac-track">
              <div className="ac-track__head">
                <span className="ac-track__title">
                  <span className="ac-track__n">{tr.n}</span>
                  <b>{tr.title}</b>
                </span>
                <span className="as-muted ac-track__prog">{t("prog", { done: tr.done, total: tr.lessons.length })}</span>
                <span
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                  aria-label={t("progAria", { track: tr.title })}
                  className="ac-bar"
                >
                  <span style={{ width: `${pct}%` }} />
                </span>
              </div>
              <ul className="ac-lessons">
                {tr.lessons.map((l) => (
                  <li key={l.id}>
                    <Link href={`/academy/${l.id}`} className="ac-lesson">
                      <span className="ac-lesson__t">
                        <span className={l.read ? "ac-lesson__icon ac-lesson__icon--ok" : "ac-lesson__icon"}>
                          <Icon name={l.read ? "ok" : "book"} size={15} />
                        </span>
                        {l.title}
                      </span>
                      <span className="ac-lesson__min">{l.read ? t("read") : t("minutes", { n: 4 })}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
