"use client";

import { Button, Input, useToast } from "@adsweet/ui";

/** Een link om te kopiëren: alleen-lezen veld en een knop Kopieer (doorverwijzen, partnerportaal). */
export function CopyField({ value, copyText, label, button, copied }: { value: string; copyText: string; label: string; button: string; copied: string }) {
  const toast = useToast();
  return (
    <div className="rf-link">
      <Input label={label} readOnly value={value} onFocus={(e) => e.currentTarget.select()} />
      <Button
        arrow={false}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(copyText);
          } catch {
            // Geen toegang tot het klembord: het veld staat geselecteerd, kopiëren kan dan met de hand.
          }
          toast.show({ message: copied });
        }}
      >
        {button}
      </Button>
    </div>
  );
}
