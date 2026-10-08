import type { FieldErrors } from "@/lib/validation/schemas";

export type ActionState = { ok: boolean; message: string; errors?: FieldErrors; at?: number };
