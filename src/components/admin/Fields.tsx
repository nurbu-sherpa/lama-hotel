"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { CheckboxField, SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { useFieldErrors } from "./AdminForm";

/** Admin field wrappers that pick up validation errors from the surrounding <AdminForm>. */

type Base = { label: string; name: string; hint?: ReactNode; className?: string; optional?: boolean };

export function AText(props: Base & InputHTMLAttributes<HTMLInputElement>) {
  const errors = useFieldErrors();
  return <TextField {...props} error={errors[props.name]} />;
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
