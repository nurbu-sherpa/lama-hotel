/** Shared by /api/chat and the chat panel (browser-safe). */

/** Separates the reply text from a booking draft at the end of the /api/chat stream (never appears in replies). */
export const DRAFT_SEPARATOR = String.fromCharCode(0x1e);

/** A booking request prepared by the assistant, waiting for the guest's "Yes, send to the owner". */
export type InquiryDraft = {
  /** Signed server-side; the confirm endpoint only accepts untampered, unexpired tokens. */
  token: string;
  summary: [label: string, value: string][];
};
