"use client";

import { useRouter } from "next/navigation";
import { Tabs } from "@adsweet/ui";

/** Tabbladen die elk een eigen url hebben (?tab=…), met navigatie binnen de app. */
export function RouteTabs<T extends string>({ label, value, items }: { label: string; value: T; items: { value: T; label: string; href: string }[] }) {
  const router = useRouter();
  return (
    <Tabs
      label={label}
      value={value}
      items={items.map(({ value: v, label: l }) => ({ value: v, label: l }))}
      onChange={(v) => router.push(items.find((i) => i.value === v)!.href, { scroll: false })}
    />
  );
}
