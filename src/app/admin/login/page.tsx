import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { LogoMark } from "@/components/public/Logo";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  // Same validity check as every admin page (an outdated session must not bounce back and forth).
  if (await getAdmin()) redirect("/admin/dashboard");
  const passwordChanged = (await searchParams).changed === "1";

  return (
    <main id="main" className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <LogoMark className="mx-auto h-12 w-12" />
          <h1 className="mt-4 font-display text-2xl font-semibold text-forest-900">Lama Hotel &amp; Lodge</h1>
          <p className="mt-1 text-sm text-muted">Admin dashboard — please log in</p>
        </div>
        {passwordChanged && (
          <p role="status" className="mt-6 rounded-md border border-forest-200 bg-forest-50 px-4 py-3 text-sm text-forest-900">
            Password changed. All devices have been signed out — please log in with your new password.
          </p>
        )}
        <LoginForm />
      </div>
    </main>
  );
}
