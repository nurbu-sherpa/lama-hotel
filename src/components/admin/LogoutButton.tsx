"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, LogOut } from "lucide-react";
import { logout } from "@/server/actions/admin/account";
import { Modal } from "./Modal";

function ConfirmLogout() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-forest-800 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-900 disabled:opacity-60"
    >
      {pending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <LogOut size={16} aria-hidden />}
      Log out
    </button>
  );
}

/** Header "Log out" that asks for confirmation first. */
export function LogoutButton() {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-l border-cream-200 pl-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-10 items-center gap-2 rounded-md px-2 text-sm font-semibold text-muted hover:bg-cream-100 hover:text-ink"
        aria-label="Log out"
      >
        <LogOut size={16} aria-hidden /> <span className="hidden sm:inline">Log out</span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Log out?">
        <p className="text-sm text-muted">Are you sure you want to log out of the admin panel?</p>
        <form action={logout} className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={() => setOpen(false)} className="min-h-10 rounded-lg border border-cream-300 px-4 text-sm font-semibold hover:bg-cream-100">
            Cancel
          </button>
          <ConfirmLogout />
        </form>
      </Modal>
    </div>
  );
}
