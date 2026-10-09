"use client";

import { startTransition, useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { login } from "@/server/actions/admin/account";

const INPUT =
  "w-full rounded-lg border border-cream-300 bg-white p-4 pe-12 text-sm shadow-sm focus:border-transparent focus:ring-2 focus:ring-forest-500 focus:outline-none";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, { ok: false, message: "" });
  const [showPassword, setShowPassword] = useState(false);
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
      <div>
        <label className="sr-only" htmlFor="email">
          Email
        </label>
        <div className="relative">
          <input id="email" name="email" type="email" required autoComplete="username" maxLength={254} placeholder="Enter your email" className={INPUT} />
          <span className="pointer-events-none absolute inset-y-0 end-0 grid place-content-center px-4">
            <svg stroke="currentColor" viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-gray-400" aria-hidden="true">
              <path
                d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </div>
      </div>

      <div>
        <label className="sr-only" htmlFor="password">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            maxLength={200}
            placeholder="Enter your password"
            className={INPUT}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 end-0 grid place-content-center px-4 text-gray-400 hover:text-gray-600"
          >
            <svg stroke="currentColor" viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
              {showPassword ? (
                <path d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              ) : (
                <>
                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>
      <button type="submit" disabled={pending} className="btn-dark w-full !rounded-lg">
        {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
        Log in
      </button>
    </form>
  );
}
