/**
 * Guest emails and phone numbers never reach the AI model. Before a chat is sent to the model,
 * each one in the guest's messages is replaced by a placeholder like [email-1] / [phone-1].
 * The createInquiry tool turns placeholders back into real values on the server, and the chat
 * widget shows the real values to the guest. Pure + deterministic, so server and browser agree.
 */

export type ChatMessage = { role: "user" | "assistant"; content: string };

const EMAIL = /[^\s@<>()[\]]+@[^\s@<>()[\]]+\.[a-z]{2,}/gi;
// 7–15 digits, optionally with +, spaces, dashes, dots or brackets — but not ISO dates (2026-10-20).
const PHONE = /\+?\(?\d[\d\s\-().]{5,18}\d/g;
const isPhone = (s: string) => {
  const digits = s.replace(/\D/g, "").length;
  return digits >= 7 && digits <= 15 && !/\d{4}-\d{2}-\d{2}/.test(s);
};

export function redactContacts(messages: ChatMessage[]) {
  const values = new Map<string, string>(); // placeholder → real value
  const tokens = new Map<string, string>(); // real value → placeholder
  const counts = { email: 0, phone: 0 };
  const placeholder = (kind: "email" | "phone", value: string) => {
    let t = tokens.get(value);
    if (!t) {
      t = `[${kind}-${++counts[kind]}]`;
      tokens.set(value, t);
      values.set(t, value);
    }
    return t;
  };
  const redacted = messages.map((m) =>
    m.role === "user"
      ? {
          ...m,
          content: m.content
            .replace(EMAIL, (v) => placeholder("email", v))
            .replace(PHONE, (v) => (isPhone(v) ? placeholder("phone", v.trim()) : v)),
        }
      : m,
  );
  return { messages: redacted, values };
}

/** Put real values back into text that contains placeholders (tool arguments, replies shown to the guest). */
export function restoreContacts(text: string, values: Map<string, string>) {
  return text.replace(/\[(?:email|phone)-\d+\]/g, (t) => values.get(t) ?? t);
}
