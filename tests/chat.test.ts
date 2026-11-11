import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { redactContacts, restoreContacts } from "../src/lib/ai/redact";
import { stayDatesSchema } from "../src/lib/validation/schemas";
import { detectLanguage } from "../src/lib/ai/language";

describe("chat: guest contact details never reach the model", () => {
  it("replaces emails and phones with placeholders and restores them", () => {
    const { messages, values } = redactContacts([
      { role: "user", content: "I'm Asha, asha@example.com, phone +977 981-8486480. Arriving 2026-11-02." },
      { role: "assistant", content: "Thanks! Shall I send it to [email-1]?" },
      { role: "user", content: "Yes, asha@example.com is right" },
    ]);
    assert.equal(messages[0].content, "I'm Asha, [email-1], phone [phone-1]. Arriving 2026-11-02.");
    assert.equal(messages[2].content, "Yes, [email-1] is right");
    assert.equal(restoreContacts("Email [email-1], phone [phone-1]", values), "Email asha@example.com, phone +977 981-8486480");
  });

  it("leaves dates, prices and short numbers alone", () => {
    const text = "2 rooms from 2026-11-02 to 2026-11-05, budget NPR 2,500, 3 guests";
    assert.equal(redactContacts([{ role: "user", content: text }]).messages[0].content, text);
  });
});

describe("chat: availability dates", () => {
  const today = "2026-10-16";
  const ok = (checkIn: string, checkOut: string) => stayDatesSchema(today).safeParse({ checkIn, checkOut }).success;

  it("accepts a normal stay", () => assert.ok(ok("2026-10-20", "2026-10-22")));
  it("rejects past check-in", () => assert.equal(ok("2026-10-15", "2026-10-18"), false));
  it("rejects check-out on or before check-in", () => {
    assert.equal(ok("2026-10-20", "2026-10-20"), false);
    assert.equal(ok("2026-10-20", "2026-10-19"), false);
  });
  it("rejects stays longer than 60 nights and dates over two years ahead", () => {
    assert.equal(ok("2026-11-01", "2027-01-15"), false);
    assert.equal(ok("2029-01-01", "2029-01-03"), false);
  });
  it("rejects malformed dates", () => assert.equal(ok("20/10/2026", "2026-10-22"), false));
});

describe("chat: reply language follows the guest's latest message", () => {
  const cases: [string, string][] = [
    ["k xa", "romanized-nepali"],
    ["room khali xa?", "romanized-nepali"],
    ["kati ho price?", "romanized-nepali"],
    ["jiri kasari jane", "romanized-nepali"],
    ["hajur dhanyabad", "romanized-nepali"],
    ["जिरीमा के के गर्न सकिन्छ?", "nepali"],
    ["मलाई room चाहियो", "nepali"],
    ["Is a room available this weekend?", "english"],
    ["What time is check-in?", "english"],
    ["How do I get to Jiri from Kathmandu?", "english"],
    ["thank you!", "english"],
  ];
  for (const [text, lang] of cases) it(`"${text}" → ${lang}`, () => assert.equal(detectLanguage(text), lang));
});

describe("chat: instant replies", async () => {
  const { quickReply } = await import("../src/lib/ai/quick-reply");
  const d = { phone: "+977 1", whatsapp: "+977 2", rooms: [{ name: "Deluxe", link: "/rooms/deluxe", price: "NPR 3,000 / room", totalRooms: 2 }, { name: "Standard", link: "/rooms/standard", price: "NPR 2,000 / room", totalRooms: 5 }] };
  it("answers simple questions", () => {
    assert.match(quickReply("Hi!", d)!, /Welcome/);
    assert.match(quickReply("How many rooms are there?", d)!, /7 rooms in 2 types/);
    assert.match(quickReply("how is the rates of the rooms", d)!, /NPR 3,000/);
    assert.match(quickReply("How can I inquire about the room for this date?", d)!, /booking form/);
  });
  it("leaves the rest to the model", () => {
    for (const m of ["Is a room free on 2026-12-01?", "how many rooms are available this weekend", "how much is the bus to Jiri", "can I bring my dog"]) assert.equal(quickReply(m, d), null, m);
  });
});
