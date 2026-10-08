"use client";

import { useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "./Modal";
import { AdminForm, SubmitButton } from "./AdminForm";
import type { ActionState } from "@/server/actions/admin/types";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

/**
 * A button that opens a confirmation dialog before running a destructive Server Action.
 * Hidden inputs (e.g. the item id) are passed as `fields`.
 */
export function ConfirmDialog({
  action,
  fields,
  title,
  description,
  confirmLabel = "Delete",
  triggerLabel = "Delete",
  triggerClassName,
  icon = <Trash2 size={16} aria-hidden />,
}: {
  action: Action;
  fields: Record<string, string>;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  triggerLabel?: string;
  triggerClassName?: string;
  icon?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={triggerLabel ? undefined : title}
        title={triggerLabel ? undefined : title}
        className={
          triggerClassName ??
          "inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
        }
      >
        {icon}
        {triggerLabel}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <div className="text-sm text-muted">{description}</div>
        <AdminForm action={action} onSuccess={() => setOpen(false)} className="mt-6 flex flex-wrap justify-end gap-3">
          {Object.entries(fields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <button type="button" onClick={() => setOpen(false)} className="min-h-10 rounded-lg border border-cream-300 px-4 text-sm font-semibold hover:bg-cream-100">
            Cancel
          </button>
          <SubmitButton variant="danger">{confirmLabel}</SubmitButton>
        </AdminForm>
      </Modal>
    </>
  );
}
