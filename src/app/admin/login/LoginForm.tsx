"use client";

import { startTransition, useActionState } from "react";
import { Loader2 } from "lucide-react";
import { login } from "@/server/actions/admin/account";
import { TextField } from "@/components/ui/Field";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, { ok: false, message: "" });
  return (
    <form
      className="card mt-8 space-y-5 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      {state.message && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.message}
        </p>
      )}
      <TextField label="Email" name="email" type="email" required autoComplete="username" maxLength={254} />
      <TextField label="Password" name="password" type="password" required autoComplete="current-password" maxLength={200} />
      <button type="submit" disabled={pending} className="btn-dark w-full !rounded-lg">
        {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
        Log in
      </button>
    </form>
  );
}
