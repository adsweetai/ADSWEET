import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

interface FieldShell {
  label?: ReactNode;
  help?: ReactNode;
  /** Fout of afwijking van het playbook: rand en hulptekst in Actie nodig. */
  error?: ReactNode;
  className?: string;
}

function Shell({
  id,
  label,
  help,
  error,
  className,
  children,
}: FieldShell & { id: string; children: ReactNode }) {
  return (
    <label className={["as-field", className].filter(Boolean).join(" ")} htmlFor={id}>
      {label ? <span className="as-field__label">{label}</span> : null}
      {children}
      {error ? (
        <span id={`${id}-help`} className="as-field__help as-field__help--act">
          {error}
        </span>
      ) : help ? (
        <span id={`${id}-help`} className="as-field__help">
          {help}
        </span>
      ) : null}
    </label>
  );
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix">, FieldShell {
  /** Teken vóór de waarde, bv. € */
  prefix?: string;
  invalid?: boolean;
}

export function Input({ label, help, error, className, prefix, invalid, id, ...rest }: InputProps) {
  const auto = useId();
  const fid = id ?? auto;
  const bad = invalid || !!error;
  const input = (
    <input
      id={fid}
      className={["as-input", prefix && "as-input--prefixed"].filter(Boolean).join(" ")}
      aria-invalid={bad || undefined}
      aria-describedby={help || error ? `${fid}-help` : undefined}
      {...rest}
    />
  );
  return (
    <Shell id={fid} label={label} help={help} error={error} className={className}>
      {prefix ? (
        <span className="as-field__wrap">
          <span className="as-field__prefix" aria-hidden="true">
            {prefix}
          </span>
          {input}
        </span>
      ) : (
        input
      )}
    </Shell>
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, FieldShell {
  options: { value: string; label: string }[];
}

export function Select({ label, help, error, className, options, id, ...rest }: SelectProps) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Shell id={fid} label={label} help={help} error={error} className={className}>
      <select id={fid} className="as-select" aria-invalid={error ? true : undefined} {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Shell>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldShell {}

export function Textarea({ label, help, error, className, id, ...rest }: TextareaProps) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Shell id={fid} label={label} help={help} error={error} className={className}>
      <textarea id={fid} className="as-textarea" aria-invalid={error ? true : undefined} {...rest} />
    </Shell>
  );
}
