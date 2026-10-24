"use client";

import { useId, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

export interface AccordionItem {
  q: ReactNode;
  a: ReactNode;
}

/** Accordeon met een plus die een kruis wordt. Eén item tegelijk open. */
export function Accordion({
  items,
  defaultOpen = -1,
  className,
}: {
  items: AccordionItem[];
  defaultOpen?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className={["as-accordion", className].filter(Boolean).join(" ")}>
      {items.map((it, i) => (
        <div className="as-acc" key={i}>
          <button
            type="button"
            className="as-acc__btn"
            aria-expanded={open === i}
            aria-controls={`${id}-${i}`}
            onClick={() => setOpen(open === i ? -1 : i)}
          >
            <span>{it.q}</span>
            <Icon name="plus" size={18} />
          </button>
          {open === i ? (
            <p className="as-acc__body" id={`${id}-${i}`}>
              {it.a}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
