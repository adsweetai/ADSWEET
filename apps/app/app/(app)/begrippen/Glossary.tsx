"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function Glossary({ terms }: { terms: { k: string; title: string; def: string; ex: string | null }[] }) {
  const t = useTranslations("academy.glossary");
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const list = terms.filter((x) => !query || (x.title + x.def).toLowerCase().includes(query));
  return (
    <div className="bg">
      <label className="bg-search">
        <span>{t("search")}</span>
        <input type="search" className="as-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchPh")} />
      </label>
      {list.length ? (
        <dl className="bg-list">
          {list.map((x) => (
            <div key={x.k} className="bg-term">
              <dt>{x.title}</dt>
              <dd>
                <span>{x.def}</span>
                {x.ex ? <span className="bg-term__ex">{t("yours", { ex: x.ex })}</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="as-muted" style={{ margin: 0 }}>
          {t("none", { q: q.trim() })}
        </p>
      )}
    </div>
  );
}
