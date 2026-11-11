"use client";

import { useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { CheckboxField, SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { useFieldErrors } from "./AdminForm";

/** Admin field wrappers that pick up validation errors from the surrounding <AdminForm>. */

type Base = { label: string; name: string; hint?: ReactNode; className?: string; optional?: boolean };

export function AText(props: Base & InputHTMLAttributes<HTMLInputElement>) {
  const errors = useFieldErrors();
  return <TextField {...props} error={errors[props.name]} />;
}

/** Password field with an eye button to show / hide what was typed. */
export function APassword(props: Base & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const errors = useFieldErrors();
  const [show, setShow] = useState(false);
  const toggle = (
    <button
      type="button"
      onClick={() => setShow((s) => !s)}
      aria-label={show ? "Hide password" : "Show password"}
      aria-pressed={show}
      className="rounded p-1 text-muted hover:text-ink"
    >
      {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
    </button>
  );
  return <TextField {...props} type={show ? "text" : "password"} suffix={toggle} error={errors[props.name]} />;
}

export function ATextArea(props: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const errors = useFieldErrors();
  return <TextAreaField {...props} error={errors[props.name]} />;
}

export function ASelect(props: Base & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  const errors = useFieldErrors();
  return <SelectField {...props} error={errors[props.name]} />;
}

export function ACheckbox(props: Omit<Base, "optional"> & InputHTMLAttributes<HTMLInputElement>) {
  return <CheckboxField {...props} />;
}
