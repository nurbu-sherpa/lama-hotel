import "server-only";
import { updateTag } from "next/cache";
import { z } from "zod";
import { CONTENT_TAG } from "@/config/site";
import { requireAdmin } from "@/lib/auth";
import { UploadError } from "@/lib/storage";
import { ReservationError } from "@/server/services/reservations";
import { fieldErrors } from "@/lib/validation/schemas";
import type { ActionState } from "./types";

export type { ActionState };

/** Read a FormData object into plain strings/booleans for Zod. Checkboxes → boolean. */
export function readForm(fd: FormData, keys: string[], checkboxes: string[] = []) {
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = String(fd.get(k) ?? "");
  for (const k of checkboxes) out[k] = fd.get(k) === "on" || fd.get(k) === "true";
  return out;
}

/**
 * Wraps every admin mutation:
 *  1. requireAdmin() — authorisation on EVERY server action,
 *  2. consistent error handling (no stack traces leak to the browser),
 *  3. cache invalidation so the public website updates immediately.
 */
export async function adminMutation(
  fn: () => Promise<string | ActionState>,
  opts: { revalidate?: boolean; tags?: string[] } = {},
): Promise<ActionState> {
  await requireAdmin();
  try {
    const result = await fn();
    if (opts.revalidate !== false) for (const tag of opts.tags ?? [CONTENT_TAG]) updateTag(tag);
    return typeof result === "string" ? { ok: true, message: result, at: Date.now() } : { ...result, at: Date.now() };
  } catch (err) {
    if (err instanceof z.ZodError) return { ok: false, message: "Please check the highlighted fields.", errors: fieldErrors(err), at: Date.now() };
    if (err instanceof UploadError) return { ok: false, message: err.message, at: Date.now() };
    if (err instanceof ReservationError) {
      return { ok: false, message: err.message, errors: err.field ? { [err.field]: [err.message] } : undefined, at: Date.now() };
    }
    if (typeof err === "object" && err && "code" in err && (err as { code: string }).code === "P2002") {
      return { ok: false, message: "That value is already in use (for example, the URL slug). Please choose another.", at: Date.now() };
    }
    if (typeof err === "object" && err && "code" in err && (err as { code: string }).code === "P2025") {
      return { ok: false, message: "This item no longer exists. Please refresh the page.", at: Date.now() };
    }
    console.error("Admin action failed", err);
    return { ok: false, message: "Something went wrong while saving. Please try again.", at: Date.now() };
  }
}

export const idSchema = z.string().uuid();

/** Swap sortOrder with the neighbour above/below. Works for any model with id + sortOrder. */
export async function moveItem<T extends { id: string; sortOrder: number }>(
  items: T[],
  id: string,
  direction: "up" | "down",
  update: (id: string, sortOrder: number) => Promise<unknown>,
) {
  const normalized = items.map((it, i) => ({ ...it, sortOrder: i + 1 }));
  const idx = normalized.findIndex((i) => i.id === id);
  const swap = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swap < 0 || swap >= normalized.length) return;
  [normalized[idx], normalized[swap]] = [normalized[swap], normalized[idx]];
  await Promise.all(normalized.map((it, i) => update(it.id, i + 1)));
}
