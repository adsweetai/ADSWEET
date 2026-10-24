import type { ReactNode } from "react";
import { Avatar, type SeriesColor } from "./Badges";

export interface PreviewContent {
  page: string;
  pageInitial: string;
  pageColor: SeriesColor;
  text: ReactNode;
  headline?: ReactNode;
  cta: ReactNode;
  /** Beeld of video. Zonder bron een gearceerd vak met de beschrijving. */
  media?: { src?: string; kind?: "foto" | "video"; alt?: string; placeholder?: ReactNode };
}

function Media({ media, ratio }: { media: PreviewContent["media"]; ratio: string }) {
  return (
    <div
      className={["as-preview__media", !media?.src && "as-hatch"].filter(Boolean).join(" ")}
      style={{ aspectRatio: ratio }}
    >
      {media?.src ? (
        media.kind === "video" ? (
          <video src={media.src} muted playsInline aria-label={media.alt} />
        ) : (
          <img src={media.src} alt={media.alt ?? ""} />
        )
      ) : (
        media?.placeholder
      )}
    </div>
  );
}

function Page({ c }: { c: PreviewContent }) {
  return (
    <div className="as-preview__page">
      <Avatar initial={c.pageInitial} color={c.pageColor} size={26} />
      <span>{c.page}</span>
    </div>
  );
}

/** Feed 4:5. Neutraal kader: paginanaam als tekst, beeld, tekst en de call-to-action als pil. Geen iconen van Meta. */
export function FeedPreview({
  c,
  caption,
  width = 230,
}: {
  c: PreviewContent;
  caption?: ReactNode;
  width?: number;
}) {
  return (
    <figure className="as-preview" style={{ width }}>
      <div className="as-preview__feed">
        <Page c={c} />
        <p className="as-preview__text">{c.text}</p>
        <Media media={c.media} ratio="4 / 5" />
        <div className="as-preview__foot">
          <span className="as-preview__headline">{c.headline}</span>
          <span className="as-preview__cta">{c.cta}</span>
        </div>
      </div>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

/** Stories 9:16 */
export function StoryPreview({
  c,
  caption,
  width = 170,
}: {
  c: PreviewContent;
  caption?: ReactNode;
  width?: number;
}) {
  return (
    <figure className="as-preview" style={{ width }}>
      <div className={["as-preview__tall", !c.media?.src && "as-hatch"].filter(Boolean).join(" ")}>
        {c.media?.src ? <img src={c.media.src} alt={c.media.alt ?? ""} /> : null}
        <Page c={c} />
        <span className="as-preview__center">{c.media?.src ? null : c.media?.placeholder}</span>
        <span className="as-preview__cta" style={{ alignSelf: "center" }}>
          {c.cta}
        </span>
      </div>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

/** Reels 9:16 */
export function ReelPreview({
  c,
  caption,
  width = 170,
}: {
  c: PreviewContent;
  caption?: ReactNode;
  width?: number;
}) {
  return (
    <figure className="as-preview" style={{ width }}>
      <div
        className={["as-preview__tall", !c.media?.src && "as-hatch"].filter(Boolean).join(" ")}
        style={{ justifyContent: "flex-end", gap: 8 }}
      >
        {c.media?.src ? <img src={c.media.src} alt={c.media.alt ?? ""} /> : null}
        {c.media?.src ? null : (
          <span
            className="as-preview__center"
            style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}
          >
            {c.media?.placeholder}
          </span>
        )}
        <div className="as-preview__reel">
          <span style={{ fontSize: 12, fontWeight: 500 }}>{c.page}</span>
          <span style={{ fontSize: 11.5, lineHeight: 1.35 }}>{c.text}</span>
          <span className="as-preview__cta">{c.cta}</span>
        </div>
      </div>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
