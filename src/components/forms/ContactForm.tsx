"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { submitContactMessage, type PublicFormState } from "@/server/actions/public";
import { Honeypot, TextAreaField, TextField } from "@/components/ui/Field";
import { ErrorSummary } from "@/components/ui/ErrorSummary";
import { Turnstile } from "./Turnstile";

const initial: PublicFormState = { status: "idle" };

export function ContactForm() {
  const [state, action, pending] = useActionState(submitContactMessage, initial);
  const v = state.values ?? {};
  const e = state.errors ?? {};
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status !== "idle") statusRef.current?.focus();
  }, [state]);

  if (state.status === "success") {
    return (
      <div ref={statusRef} tabIndex={-1} role="status" className="card border-t-4 border-t-forest-600 p-8 text-center outline-none">
        <CheckCircle2 size={44} className="mx-auto text-forest-600" aria-hidden />
        <p className="mt-4 text-lg text-ink/85">{state.message}</p>
      </div>
    );
  }

  return (
    <form
      className="card relative space-y-5 p-5 sm:p-8"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (pending) return;
        const fd = new FormData(ev.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      {state.status === "error" && state.message && (
        <ErrorSummary ref={statusRef} message={state.message} errors={e} labels={{ name: "Name", email: "Email", phone: "Phone", message: "Message" }} />
      )}
      <TextField label="Name" name="name" required maxLength={100} autoComplete="name" defaultValue={v.name} error={e.name} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Email" name="email" type="email" required maxLength={254} autoComplete="email" defaultValue={v.email} error={e.email} />
        <TextField
          label="Phone"
          name="phone"
          type="tel"
          optional
          maxLength={25}
          autoComplete="tel"
          pattern="^\+?[0-9\s\-().]{7,25}$"
          defaultValue={v.phone}
          error={e.phone}
        />
      </div>
      <TextAreaField label="Message" name="message" required minLength={5} maxLength={3000} rows={5} defaultValue={v.message} error={e.message} />
      <Honeypot />
      <Turnstile resetKey={state} />
      <button type="submit" className="btn-dark !min-h-12 w-full text-base sm:w-auto sm:!px-8" disabled={pending} aria-busy={pending}>
        {pending ? (
          <>
            <Loader2 size={18} className="animate-spin" aria-hidden /> Sending…
          </>
        ) : (
          "Send Message"
        )}
      </button>
    </form>
  );
}
