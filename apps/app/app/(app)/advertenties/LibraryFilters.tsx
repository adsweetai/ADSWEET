"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@adsweet/ui";

/** Filters van de bibliotheek. Elke keuze komt in de url, zodat je ze kan delen en terugkeren. */
export function LibraryFilters({ filters }: { filters: { key: string; label: string; options: { value: string; label: string }[] }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("advertentie");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };
  return (
    <div className="lib-filters">
      {filters.map((f) => (
        <Select key={f.key} label={f.label} value={sp.get(f.key) ?? ""} options={f.options} onChange={(e) => set(f.key, e.target.value)} />
      ))}
    </div>
  );
}
