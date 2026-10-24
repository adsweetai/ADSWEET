"use client";

import { useId, useState } from "react";
import { Icon } from "@adsweet/ui";

/** Sleepvak voor beelden en video's. */
export function Dropzone({
  title,
  sub,
  multiple,
  big,
  onFiles,
  disabled,
}: {
  title: string;
  sub?: string;
  multiple?: boolean;
  big?: boolean;
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const [over, setOver] = useState(false);
  return (
    <label
      htmlFor={id}
      className={["up-drop", big && "up-drop--big"].filter(Boolean).join(" ")}
      data-over={over}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
        if (files.length && !disabled) onFiles(multiple ? files : files.slice(0, 1));
      }}
    >
      <Icon name="upload" size={22} />
      <b>{title}</b>
      {sub ? <span className="as-small as-muted">{sub}</span> : null}
      <input
        id={id}
        type="file"
        accept="image/*,video/*"
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
    </label>
  );
}
