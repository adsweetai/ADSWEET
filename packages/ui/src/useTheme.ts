"use client";

import { useSyncExternalStore } from "react";
import type { Theme } from "./theme";

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}

const read = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

/** Het thema dat nu op <html> staat. Volgt elke wissel. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, read, () => "light");
}
