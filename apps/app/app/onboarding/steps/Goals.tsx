"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Goal } from "@adsweet/db";
import { breakEvenRoas, leadMax, maxCostPerSale } from "@adsweet/playbook";
import { ChoiceCards, Input, Pills, Select, TextButton, formatEuro, formatRoas } from "@adsweet/ui";
import { goalAction, numbersAction } from "../actions";
import { ObTip, StepFooter, num, useStepNav, useVM } from "../shared";

type Area = "radius" | "prov" | "land";

// ---------------------------------------------------------------------------
// Stap 4 · Wat wil je bereiken?
// ---------------------------------------------------------------------------

export function StepGoal() {
  const vm = useVM();
  const t = useTranslations("onboarding");
  const nav = useStepNav();
  const g = vm.goal;
  const [type, setType] = useState<Goal["type"] | null>(g.type);
  const [zaak, setZaak] = useState(g.zaakMode);
  const [area, setArea] = useState<Area>(g.area);
  const [areaValue, setAreaValue] = useState(g.areaValue);
  const [radius, setRadius] = useState(String(g.radius));
  const [countries, setCountries] = useState(g.countries);
  const [languages, setLanguages] = useState(g.languages);
  const [age, setAge] = useState(g.age);
  const [special, setSpecial] = useState(g.special);
  const goals = t.raw("goals") as [string, string][];
  const zaakOpts = t.raw("zaakOpts") as string[];
  const areas = t.raw("areas") as string[];
  const areaLabels = t.raw("areaLabels") as string[];
  const ids: Goal["type"][] = ["verkopen", "aanvragen", "zaak", "anders"];
  const areaIds: Area[] = ["radius", "prov", "land"];
  return (
    <>
      <h1 className="ob-h1">{t("goalTitle")}</h1>
      <ChoiceCards label={t("goalTitle")} value={type} options={ids.map((id, i) => ({ value: id, title: goals[i][0], sub: goals[i][1] }))} onChange={setType} />
      {type === "zaak" ? (
        <div className="ob-group">
          <span className="ob-label">{t("zaakQ")}</span>
          <Pills
            label={t("zaakQ")}
            mode="radio"
            value={zaak}
            options={[
              { value: "aanvragen", label: zaakOpts[0] },
              { value: "bekendheid", label: zaakOpts[1] },
            ]}
            onChange={setZaak}
          />
        </div>
      ) : null}
      <section className="ob-group">
        <h2 className="ob-h2">{t("where")}</h2>
        <Pills label={t("where")} mode="radio" value={area} options={areaIds.map((id, i) => ({ value: id, label: areas[i] }))} onChange={setArea} />
        <div className="ob-grid">
          <Input label={areaLabels[areaIds.indexOf(area)]} value={areaValue} onChange={(e) => setAreaValue(e.target.value)} />
          {area === "radius" ? (
            <Select
              label={t("radius")}
              value={radius}
              options={["10", "15", "25", "40"].filter((r) => !special || Number(r) >= 25).map((r) => ({ value: r, label: `${r} km` }))}
              onChange={(e) => setRadius(e.target.value)}
            />
          ) : null}
          <Input label={t("countries")} value={countries} onChange={(e) => setCountries(e.target.value)} />
          <Input label={t("langsLabel")} value={languages} onChange={(e) => setLanguages(e.target.value)} />
          <Input label={t("age")} value={special ? t("ageDefault") : age} disabled={special} onChange={(e) => setAge(e.target.value)} />
        </div>
      </section>
      <ObTip more>{t("goalTip")}</ObTip>
      <div className="ob-group">
        <span className="ob-label">{t("special")}</span>
        <Pills
          label={t("special")}
          mode="radio"
          value={special ? "ja" : "nee"}
          options={[
            { value: "nee", label: t("no") },
            { value: "ja", label: t("yes") },
          ]}
          onChange={(v) => {
            setSpecial(v === "ja");
            if (v === "ja" && Number(radius) < 25) setRadius("25");
          }}
        />
        {special ? <p className="ob-note">{t("specialInfo")}</p> : null}
        <span className="as-small as-muted">{t("political")}</span>
      </div>
      <StepFooter
        prev={nav.prev}
        label={t("next")}
        disabled={!type}
        pending={nav.pending}
        onNext={() =>
          nav.next(async () => {
            if (!type) return false;
            const res = await goalAction({ type, zaakMode: zaak, area, areaValue, radius: Number(radius), countries, languages, age, special });
            return res.ok;
          })
        }
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Stap 5 · Je cijfers
// ---------------------------------------------------------------------------

export function StepNumbers() {
  const vm = useVM();
  const t = useTranslations("onboarding");
  const nav = useStepNav();
  const g = vm.goal;
  const kind = g.type === "verkopen" ? "sales" : g.type === "aanvragen" || (g.type === "zaak" && g.zaakMode === "aanvragen") ? "leads" : "none";
  const [aov, setAov] = useState(g.aov);
  const [margin, setMargin] = useState(g.margin);
  const [roasGoal, setRoasGoal] = useState(g.targetRoas);
  const [perProduct, setPerProduct] = useState(false);
  const [productMargins, setProductMargins] = useState<string[]>(vm.offers.map(() => margin || ""));
  const [cpl, setCpl] = useState(g.cpl);
  const [help, setHelp] = useState(true);
  const [clv, setClv] = useState(g.clv);
  const [lmargin, setLmargin] = useState(g.lmargin);
  const [chance, setChance] = useState(g.chance);

  const marginN = (() => {
    if (perProduct) {
      const list = productMargins.map(num).filter((x) => x > 0);
      if (list.length) return list.reduce((a, b) => a + b, 0) / list.length / 100;
    }
    const m = num(margin);
    return m > 1 ? m / 100 : m;
  })();
  const aovN = num(aov);
  const be = marginN > 0 ? breakEvenRoas(marginN) : 0;
  const calcSales =
    marginN > 0 && aovN > 0
      ? t("calcSales", { m: `${Math.round(marginN * 100)}%`, be: formatRoas(be), per: formatEuro(be, 2), max: formatEuro(maxCostPerSale(aovN, marginN), 2) })
      : "";
  const chanceN = (() => {
    const m = /(\d+)\s*op\s*(\d+)/i.exec(chance);
    if (m) return Number(m[1]) / Number(m[2]);
    const p = num(chance);
    return p > 1 ? p / 100 : p;
  })();
  const lm = num(lmargin) > 1 ? num(lmargin) / 100 : num(lmargin);
  const max = leadMax(num(clv), lm, chanceN);

  return (
    <>
      <h1 className="ob-h1">{t("numbersTitle")}</h1>
      {kind === "sales" ? (
        <>
          <div className="ob-grid">
            <Input label={t("aov")} inputMode="decimal" value={aov} onChange={(e) => setAov(e.target.value)} />
            <Input label={t("margin")} inputMode="decimal" value={margin} disabled={perProduct} onChange={(e) => setMargin(e.target.value)} />
            <Input label={t("roasGoal")} inputMode="decimal" placeholder={t("optional")} value={roasGoal} onChange={(e) => setRoasGoal(e.target.value)} />
          </div>
          {vm.offers.length ? <TextButton onClick={() => setPerProduct((p) => !p)}>{t("perProduct")}</TextButton> : null}
          {perProduct ? (
            <div className="as-tablewrap">
              <table className="as-table">
                <thead>
                  <tr>
                    <th>{t("product")}</th>
                    <th>{t("margin")}</th>
                  </tr>
                </thead>
                <tbody>
                  {vm.offers.map((o, i) => (
                    <tr key={o.name}>
                      <td>{o.name}</td>
                      <td>
                        <input
                          className="as-input ob-cell"
                          aria-label={`${t("margin")} ${o.name}`}
                          value={productMargins[i]}
                          onChange={(e) => setProductMargins((x) => x.map((y, j) => (j === i ? e.target.value : y)))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <div role="status" className="ob-calc">
            <span>{t("calc")}</span>
            <span>{calcSales || t("calcEmpty")}</span>
          </div>
        </>
      ) : null}
      {kind === "leads" ? (
        <>
          <div className="ob-grid">
            <Input label={t("cplQ")} prefix="€" inputMode="decimal" value={cpl} onChange={(e) => setCpl(e.target.value)} />
          </div>
          <TextButton aria-expanded={help} onClick={() => setHelp((h) => !h)}>
            {t("helpBtn")}
          </TextButton>
          {help ? (
            <div className="ob-calc">
              <div className="ob-grid">
                <Input label={t("clv")} value={clv} onChange={(e) => setClv(e.target.value)} />
                <Input label={t("margin")} value={lmargin} onChange={(e) => setLmargin(e.target.value)} />
                <Input label={t("chance")} value={chance} onChange={(e) => setChance(e.target.value)} />
              </div>
              <span role="status" className="ob-calc__big">
                {max > 0 ? t("calcLeads", { x: formatEuro(Math.round(max * 100) / 100) }) : t("calcEmpty")}
              </span>
              <span className="as-small as-muted">{t("calcLeadsSub", { clv, m: lmargin, c: chance })}</span>
            </div>
          ) : null}
        </>
      ) : null}
      {kind === "none" ? <p className="ob-note">{t("numbersNone")}</p> : null}
      <ObTip>{t("numbersTip")}</ObTip>
      <StepFooter
        prev={nav.prev}
        label={t("next")}
        pending={nav.pending}
        onNext={() =>
          nav.next(async () => {
            if (kind === "none") return true;
            const res = await numbersAction({
              aov,
              margin: perProduct ? `${Math.round(marginN * 100)}%` : margin,
              targetRoas: roasGoal,
              cpl,
              clv,
              lmargin,
              chance,
            });
            return res.ok;
          })
        }
      />
    </>
  );
}
