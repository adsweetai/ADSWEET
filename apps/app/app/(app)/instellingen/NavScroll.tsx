"use client";

import { useEffect } from "react";

/** Op gsm scrolt de lijst van Instellingen opzij: zet het gekozen onderdeel in beeld, zonder de pagina te verschuiven. */
export function NavScroll() {
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>(".st-nav");
    const cur = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (nav && cur && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = cur.offsetLeft - nav.offsetLeft - 16;
  }, []);
  return null;
}
