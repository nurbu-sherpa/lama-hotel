import type { ComponentProps, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/format";

type Common = { label: string; name: string; error?: string[]; hint?: ReactNode; className?: string; optional?: boolean };

function Wrapper({ id, label, error, hint, className, optional, children }: Omit<Common, "name"> & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
        {optional && <span className="ml-1 font-normal text-muted">(optional)</span>}
      </label>
      {children}
      {hint && !error?.length && (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      )}
      {error?.length ? (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error[0]}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, error?: string[], hint?: ReactNode) {
  return error?.length ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

export function TextField({ label, name, error, hint, className, optional, ...props }: Common & ComponentProps<"input">) {
  const id = props.id ?? `f-${name}`;
  return (
    <Wrapper id={id} label={label} error={error} hint={hint} className={className} optional={optional}>
      <input
        id={id}
        name={name}
        aria-invalid={error?.length ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className="field-input"
        {...props}
      />
    </Wrapper>
  );
}

export function TextAreaField({ label, name, error, hint, className, optional, ...props }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = props.id ?? `f-${name}`;
  return (
    <Wrapper id={id} label={label} error={error} hint={hint} className={className} optional={optional}>
      <textarea
        id={id}
        name={name}
        rows={4}
        aria-invalid={error?.length ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className="field-input resize-y"
        {...props}
      />
    </Wrapper>
  );
}

export function SelectField({
  label,
  name,
  error,
  hint,
  className,
  optional,
  children,
  ...props
}: Common & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  const id = props.id ?? `f-${name}`;
  return (
    <Wrapper id={id} label={label} error={error} hint={hint} className={className} optional={optional}>
      <select
        id={id}
        name={name}
        aria-invalid={error?.length ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className="field-input"
        {...props}
      >
        {children}
      </select>
    </Wrapper>
  );
}

export function CheckboxField({ label, name, hint, className, ...props }: Omit<Common, "error"> & InputHTMLAttributes<HTMLInputElement>) {
  const id = props.id ?? `f-${name}`;
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <input id={id} name={name} type="checkbox" className="mt-0.5 h-5 w-5 rounded border-cream-300 accent-forest-700" {...props} />
      <label htmlFor={id} className="text-sm">
        <span className="font-medium text-ink">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </label>
    </div>
  );
}

/** Invisible honeypot field — real visitors never fill it in. */
export function Honeypot() {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label htmlFor="f-website">Website</label>
      <input id="f-website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
    </div>
  );
}
