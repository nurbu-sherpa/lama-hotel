/**
 * Which language the guest wrote in — decided in code, not left to the model (smaller models drift between
 * English, Nepali and Romanized Nepali otherwise). Pure, so it is unit-tested.
 */
export type GuestLanguage = "nepali" | "romanized-nepali" | "english";

// Words that are clearly Romanized Nepali (not English). One is enough.
const STRONG = new Set(
  "xa xaina xu chha chhaina cha chaina chu hajur hajurlai kati kasari kaha kahile kina kun k6 khali garna garnu garne garchu garxu garxa garcha sakinxa sakincha sakxu milxa milcha milchha bhannus bhanu bhanne bhayo hunxa huncha hunchha thikai thik ramro dherai tapai tapailai tapaiko hami hamro mero timi aaja aja bholi parsi kotha paisa pugxa pugcha pugna jane jana janu aaunu aauxu basna basne ani pani ni hola holani kya hai la namaskar dhanyabad dhanyabaad"
    .split(" "),
);
// Common in Romanized Nepali but short/ambiguous — need two of them.
const WEAK = new Set("k ke ma ra ho na ta ki yo tyo ko le lai ma din rat raat".split(" "));

export function detectLanguage(text: string): GuestLanguage {
  const devanagari = (text.match(/[ऀ-ॿ]/g) ?? []).length;
  const latin = (text.match(/[a-z]/gi) ?? []).length;
  if (devanagari > 0 && devanagari >= latin) return "nepali";
  const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const strong = words.filter((w) => STRONG.has(w)).length;
  const weak = words.filter((w) => WEAK.has(w)).length;
  return strong >= 1 || weak >= 2 ? "romanized-nepali" : "english";
}

const RULES: Record<GuestLanguage, string> = {
  nepali: "Nepali written in Devanagari script (नेपाली). Do not use English sentences or Roman letters, except names, links and numbers.",
  "romanized-nepali":
    'Romanized Nepali — Nepali sentences written in English letters, the casual way Nepalis text (e.g. "Thikai xa, hajur lai ni?", "Kun date ko lagi ho hajur?"). Use English only for single everyday words Nepalis say in English (room, booking, check-in, date, price, bus, WiFi). Never write full English sentences and never use Devanagari.',
  english: "English only. Do not use Nepali words, Romanized Nepali or Devanagari.",
};

/** A strict, last-in-the-prompt rule for the reply language, based on the guest's LATEST message. */
export function languageRule(latestGuestMessage: string) {
  const lang = detectLanguage(latestGuestMessage);
  return `REPLY LANGUAGE (most important rule): the guest's latest message is in ${lang === "nepali" ? "Nepali (Devanagari)" : lang === "romanized-nepali" ? "Romanized Nepali" : "English"}. Write your ENTIRE reply in ${RULES[lang]} Ignore the language of earlier messages — only the latest one counts.`;
}
