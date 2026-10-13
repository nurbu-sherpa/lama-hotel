"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff } from "lucide-react";
import type { ActionState } from "@/server/actions/admin/types";
import { AdminForm } from "./AdminForm";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

const btn = "btn-outline btn-sm btn-icon";

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
        className="btn-outline btn-sm"
        aria-label={active ? `Hide ${label} from website` : `Show ${label} on website`}
      >
        {active ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
        {active ? "Hide" : "Show"}
      </button>
    </AdminForm>
  );
}
