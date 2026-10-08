"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff } from "lucide-react";
import type { ActionState } from "@/server/actions/admin/types";
import { AdminForm } from "./AdminForm";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

const btn = "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cream-300 bg-white text-ink hover:bg-cream-100 disabled:opacity-30";

/** Up/down buttons — simpler than drag-and-drop for a non-technical owner, and keyboard accessible. */
export function MoveButtons({ action, id, isFirst, isLast, label }: { action: Action; id: string; isFirst: boolean; isLast: boolean; label: string }) {
  return (
    <AdminForm action={action} className="flex gap-1">
      <input type="hidden" name="id" value={id} />
      <button type="submit" name="direction" value="up" disabled={isFirst} className={btn} aria-label={`Move ${label} up`} title="Move up">
        <ArrowUp size={16} aria-hidden />
      </button>
      <button type="submit" name="direction" value="down" disabled={isLast} className={btn} aria-label={`Move ${label} down`} title="Move down">
        <ArrowDown size={16} aria-hidden />
      </button>
    </AdminForm>
  );
}

export function ToggleButton({ action, id, active, label }: { action: Action; id: string; active: boolean; label: string }) {
  return (
    <AdminForm action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-cream-300 bg-white px-3 text-sm font-medium hover:bg-cream-100"
        aria-label={active ? `Hide ${label} from website` : `Show ${label} on website`}
      >
        {active ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
        {active ? "Hide" : "Show"}
      </button>
    </AdminForm>
  );
}
