"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import "./dot.css";

interface Term {
  k: string;
  re: string;
  title: string;
  def: string;
}
interface Hit {
  term: Term;
  rect: DOMRect;
  color: string;
}

const CANDY = ["roos", "citroen", "munt", "bes", "hemel", "perzik"];
const SKIP =
  'button, a, input, textarea, select, option, script, style, svg, h1, nav, [data-no-terms], [role="tooltip"], [role="dialog"], [aria-hidden="true"], [contenteditable], .tour';

/**
 * Uitleg bij vakwoorden: woorden als ROAS of leerfase krijgen een stippellijn (CSS Custom Highlight API, de tekst zelf
 * verandert niet). Beweeg erover of tik erop voor de uitleg, met een voorbeeld uit je eigen cijfers.
 */
export function Terms({ examples }: { examples: Record<string, string> }) {
  const t = useTranslations("glossary");
  const pathname = usePathname();
  const terms = useMemo(() => t.raw("terms") as Term[], [t]);
  const re = useMemo(() => new RegExp(`(?<![\\p{L}\\d])(?:${terms.map((x) => `(${x.re})`).join("|")})(?![\\p{L}\\d])`, "giu"), [terms]);
  const entries = useRef(new Map<Text, { s: number; e: number; k: number; r: Range }[]>());
  const [hit, setHit] = useState<Hit | null>(null);
  const hideT = useRef(0);

  useEffect(() => {
    const root = document.getElementById("inhoud");
    if (!root) return;
    const hasHL = typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight !== "undefined";
    let scanT = 0;
    const scan = () => {
      const map = new Map<Text, { s: number; e: number; k: number; r: Range }[]>();
      const ranges: Range[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) =>
          n.nodeValue && n.nodeValue.trim().length > 1 && n.parentElement && !n.parentElement.closest(SKIP)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT,
      });
      let n: Node | null;
      let count = 0;
      while ((n = walker.nextNode()) && count < 3000) {
        const node = n as Text;
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        const list: { s: number; e: number; k: number; r: Range }[] = [];
        while ((m = re.exec(node.nodeValue ?? ""))) {
          let gi = 1;
          while (gi < m.length && m[gi] === undefined) gi++;
          const r = document.createRange();
          r.setStart(node, m.index);
          r.setEnd(node, m.index + m[0].length);
          list.push({ s: m.index, e: m.index + m[0].length, k: gi - 1, r });
          ranges.push(r);
          count++;
        }
        if (list.length) map.set(node, list);
      }
      entries.current = map;
      if (hasHL) {
        try {
          CSS.highlights.set("as-term", new Highlight(...ranges));
        } catch {
          // Oudere browsers: geen stippellijn, de uitleg werkt nog bij aanraken.
        }
      }
    };
    const schedule = () => {
      window.clearTimeout(scanT);
      scanT = window.setTimeout(scan, 300);
    };
    scan();
    const obs = new MutationObserver(schedule);
    obs.observe(root, { subtree: true, childList: true, characterData: true });
    return () => {
      obs.disconnect();
      window.clearTimeout(scanT);
      if (hasHL) CSS.highlights.delete("as-term");
    };
  }, [pathname, re]);

  useEffect(() => {
    const at = (x: number, y: number): Hit | null => {
      const doc = document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null };
      let node: Node | null = null;
      let off = 0;
      if (doc.caretPositionFromPoint) {
        const p = doc.caretPositionFromPoint(x, y);
        if (p) {
          node = p.offsetNode;
          off = p.offset;
        }
      } else if (document.caretRangeFromPoint) {
        const r = document.caretRangeFromPoint(x, y);
        if (r) {
          node = r.startContainer;
          off = r.startOffset;
        }
      }
      if (!node) return null;
      const list = entries.current.get(node as Text);
      if (!list) return null;
      for (const en of list) {
        if (off < en.s || off > en.e) continue;
        for (const rc of en.r.getClientRects())
          if (x >= rc.left - 2 && x <= rc.right + 2 && y >= rc.top - 2 && y <= rc.bottom + 2)
            return { term: terms[en.k], rect: rc, color: CANDY[en.k % CANDY.length] };
      }
      return null;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch" || document.querySelector(".tour")) return;
      const h = at(e.clientX, e.clientY);
      if (h) {
        window.clearTimeout(hideT.current);
        setHit((cur) => (cur?.term.k === h.term.k && cur.rect.left === h.rect.left ? cur : h));
      } else if (!(e.target as Element | null)?.closest?.("[role=tooltip]")) {
        window.clearTimeout(hideT.current);
        hideT.current = window.setTimeout(() => setHit(null), 250);
      }
    };
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.("[role=tooltip]")) return;
      const h = at(e.clientX, e.clientY);
      setHit(h);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setHit(null);
    document.addEventListener("pointermove", onMove);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [terms]);

  useEffect(() => setHit(null), [pathname]);

  if (!hit) return null;
  const vw = window.innerWidth;
  const w = Math.min(300, vw - 24);
  const left = Math.min(Math.max(12, hit.rect.left), vw - w - 12);
  const below = hit.rect.bottom + 10 + 180 < window.innerHeight;
  const ex = examples[hit.term.k];
  return (
    <div
      role="tooltip"
      className="term-tip"
      style={{ left, width: w, ...(below ? { top: hit.rect.bottom + 10 } : { bottom: window.innerHeight - hit.rect.top + 10 }) }}
      onPointerEnter={() => window.clearTimeout(hideT.current)}
      onPointerLeave={() => (hideT.current = window.setTimeout(() => setHit(null), 250))}
    >
      <span className="term-tip__head">
        <span className={`term-tip__dot as-dotfill--${hit.color}`} aria-hidden="true" />
        <b>{hit.term.title}</b>
      </span>
      <span>{hit.term.def}</span>
      {ex ? (
        <span>
          <b className="term-tip__label">{t("yours")}:</b> {ex}
        </span>
      ) : null}
      <Link className="as-link" href="/begrippen" onClick={() => setHit(null)}>
        {t("more")}
      </Link>
    </div>
  );
}
