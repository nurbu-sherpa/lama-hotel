// Runs with `--conditions=react-server` (see package.json) so server-only modules can be imported.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chatTools } from "../../src/lib/ai/tools";
import { readDraft, signDraft } from "../../src/lib/ai/inquiry-draft";
import { createBookingInquiry, type BookingData } from "../../src/server/services/inquiries";
import { addDays } from "../../src/lib/availability/core";
import { todayInNepal } from "../../src/lib/utils/format";

const opts = { toolCallId: "t1", messages: [] } as never;
const checkIn = addDays(todayInNepal(), 10);
const booking: BookingData = {
  name: "Asha Rai",
  email: "asha@example.com",
  phone: "+9779818486480",
  country: "Nepal",
  checkIn,
  checkOut: addDays(checkIn, 2),
  guests: 2,
  roomSlug: "deluxe-double",
  numberOfRooms: 1,
  message: "",
  arrivalInfo: "",
};

describe("chat tool: createInquiry only prepares a draft — the AI can't send", () => {
  it("does not import anything that writes to the database", () => {
    const src = readFileSync(new URL("../../src/lib/ai/tools.ts", import.meta.url), "utf8");
    assert.doesNotMatch(src, /services\/inquiries|prisma|lib\/db/);
  });

  it("rejects past dates and never produces a card", async () => {
    const drafts: unknown[] = [];
    const tools = chatTools({ contacts: new Map(), onDraft: (d) => drafts.push(d) });
    const r = (await tools.createInquiry.execute!({ ...booking, checkIn: "2020-01-01", checkOut: "2020-01-03" }, opts)) as { ok: boolean };
    assert.equal(r.ok, false);
    assert.equal(drafts.length, 0);
  });
});

describe("booking draft token", () => {
  it("round-trips the booking data", () => assert.deepEqual(readDraft(signDraft(booking)), booking));

  it("rejects tampered tokens", () => {
    const [body, sig] = signDraft(booking).split(".");
    const forged = Buffer.from(JSON.stringify({ data: { ...booking, numberOfRooms: 8 }, exp: Date.now() + 60_000 })).toString("base64url");
    assert.equal(readDraft(`${forged}.${sig}`), null);
    assert.equal(readDraft(`${body}.${sig.slice(0, -2)}xx`), null);
    assert.equal(readDraft("garbage"), null);
  });

  it("expires after 30 minutes", () => {
    const token = signDraft(booking, Date.now() - 31 * 60_000);
    assert.equal(readDraft(token), null);
  });
});

describe("confirmed chat request → booking inquiry only", () => {
  it("creates a NEW inquiry (never a reservation) and notifies like the booking form", async () => {
    const calls: string[] = [];
    let created: Record<string, unknown> | undefined;
    const db = {
      room: { findUnique: async () => (calls.push("room.findUnique"), { id: "r1", name: "Deluxe Double", price: 2500, currency: "NPR", priceSuffix: "per night" }) },
      bookingInquiry: {
        count: async () => (calls.push("bookingInquiry.count"), 0),
        findFirst: async () => (calls.push("bookingInquiry.findFirst"), null),
        create: async ({ data }: { data: Record<string, unknown> }) => {
          calls.push("bookingInquiry.create");
          created = data;
          return { id: "i1" };
        },
      },
    };
    const deferred: unknown[] = [];
    const r = await createBookingInquiry(readDraft(signDraft(booking))!, "h", { db: db as never, defer: (t) => deferred.push(t) });
    assert.equal(r.status, "created");
    assert.deepEqual(calls, ["room.findUnique", "bookingInquiry.count", "bookingInquiry.findFirst", "bookingInquiry.create"]);
    assert.equal("status" in created!, false); // DB default NEW applies
    assert.equal(deferred.length, 2); // owner + guest emails
  });
});
