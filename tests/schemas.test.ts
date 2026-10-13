import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { bookingSchema, contactSchema, reservationSchema } from "../src/lib/validation/schemas";

const TODAY = "2026-06-01";

const booking = (o: Record<string, string> = {}) => ({
  name: "Asha Rai",
  email: "asha@example.com",
  phone: "+977 9812345678",
  country: "Nepal",
  checkIn: "2026-06-10",
  checkOut: "2026-06-12",
  guests: "2",
  roomSlug: "standard-room",
  numberOfRooms: "1",
  message: "",
  arrivalInfo: "",
  website: "",
  ...o,
});

/** Fields that failed (each once), e.g. ["checkOut"]. */
function errorPaths(r: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) {
  return r.success ? [] : [...new Set(r.error!.issues.map((i) => i.path.join(".")))];
}

describe("booking inquiry form", () => {
  it("accepts a normal inquiry and coerces numbers", () => {
    const r = bookingSchema(TODAY).safeParse(booking());
    assert.ok(r.success);
    assert.equal(r.data.guests, 2);
    assert.equal(r.data.numberOfRooms, 1);
  });

  it("normalises email and strips control characters", () => {
    const r = bookingSchema(TODAY).safeParse(booking({ email: "  Asha@Example.COM ", name: "Asha\u0000 Rai " }));
    assert.ok(r.success);
    assert.equal(r.data.email, "asha@example.com");
    assert.equal(r.data.name, "Asha Rai");
  });

  it("rejects a check-in in the past", () => {
    assert.deepEqual(errorPaths(bookingSchema(TODAY).safeParse(booking({ checkIn: "2026-05-31", checkOut: "2026-06-02" }))), ["checkIn"]);
  });

  it("allows check-in today", () => {
    assert.ok(bookingSchema(TODAY).safeParse(booking({ checkIn: TODAY, checkOut: "2026-06-02" })).success);
  });

  it("rejects check-out on or before check-in", () => {
    assert.deepEqual(errorPaths(bookingSchema(TODAY).safeParse(booking({ checkOut: "2026-06-10" }))), ["checkOut"]);
    assert.deepEqual(errorPaths(bookingSchema(TODAY).safeParse(booking({ checkOut: "2026-06-09" }))), ["checkOut"]);
  });

  it("caps a stay at 60 nights", () => {
    assert.ok(bookingSchema(TODAY).safeParse(booking({ checkIn: "2026-06-10", checkOut: "2026-08-09" })).success); // 60 nights
    assert.deepEqual(errorPaths(bookingSchema(TODAY).safeParse(booking({ checkIn: "2026-06-10", checkOut: "2026-08-10" }))), ["checkOut"]); // 61
  });

  it("rejects dates more than two years ahead", () => {
    assert.deepEqual(errorPaths(bookingSchema(TODAY).safeParse(booking({ checkIn: "2028-06-10", checkOut: "2028-06-12" }))), ["checkIn"]);
  });

  it("rejects invalid dates and phone numbers", () => {
    assert.ok(errorPaths(bookingSchema(TODAY).safeParse(booking({ checkIn: "10/06/2026" }))).includes("checkIn"));
    assert.deepEqual(errorPaths(bookingSchema(TODAY).safeParse(booking({ phone: "12345" }))), ["phone"]); // too few digits
    assert.deepEqual(errorPaths(bookingSchema(TODAY).safeParse(booking({ phone: "call me" }))), ["phone"]);
  });

  it("enforces guest and room limits", () => {
    assert.deepEqual(errorPaths(bookingSchema(TODAY).safeParse(booking({ guests: "0" }))), ["guests"]);
    assert.deepEqual(errorPaths(bookingSchema(TODAY).safeParse(booking({ numberOfRooms: "9" }))), ["numberOfRooms"]);
    assert.deepEqual(errorPaths(bookingSchema(TODAY).safeParse(booking({ guests: "1.5" }))), ["guests"]);
  });

  it("fails when the honeypot is filled (bots)", () => {
    assert.deepEqual(errorPaths(bookingSchema(TODAY).safeParse(booking({ website: "http://spam" }))), ["website"]);
  });
});

describe("contact form", () => {
  it("phone is optional but must be valid if given", () => {
    const base = { name: "Asha", email: "a@example.com", message: "Do you have parking?", website: "" };
    assert.ok(contactSchema.safeParse({ ...base, phone: "" }).success);
    assert.deepEqual(errorPaths(contactSchema.safeParse({ ...base, phone: "abc" })), ["phone"]);
    assert.deepEqual(errorPaths(contactSchema.safeParse({ ...base, phone: "", message: "hi" })), ["message"]);
  });
});

describe("admin reservation form", () => {
  const ROOM = "11111111-1111-4111-8111-111111111111";
  const reservation = (o: Record<string, unknown> = {}) => ({
    guestName: "Asha Rai",
    phone: "+977 9812345678",
    email: "",
    country: "",
    checkIn: "2026-06-10",
    checkOut: "2026-06-12",
    guests: "2",
    roomId: ROOM,
    numberOfRooms: "1",
    unitIds: [],
    source: "WALK_IN",
    status: "CONFIRMED",
    paymentStatus: "UNPAID",
    amount: "",
    adminNotes: "",
    ...o,
  });

  it("accepts a walk-in with no email and no amount", () => {
    const r = reservationSchema.safeParse(reservation());
    assert.ok(r.success);
    assert.equal(r.data.amount, null);
  });

  it("parses amount as a whole number", () => {
    assert.equal(reservationSchema.safeParse(reservation({ amount: " 4500 " })).data?.amount, 4500);
    assert.deepEqual(errorPaths(reservationSchema.safeParse(reservation({ amount: "45.50" }))), ["amount"]);
    assert.deepEqual(errorPaths(reservationSchema.safeParse(reservation({ amount: "-1" }))), ["amount"]);
  });

  it("same-day check-out is only allowed for a checked-out stay", () => {
    assert.deepEqual(errorPaths(reservationSchema.safeParse(reservation({ checkOut: "2026-06-10" }))), ["checkOut"]);
    assert.ok(reservationSchema.safeParse(reservation({ checkOut: "2026-06-10", status: "CHECKED_OUT" })).success);
  });

  it("rejects stays longer than a year", () => {
    assert.deepEqual(errorPaths(reservationSchema.safeParse(reservation({ checkOut: "2027-06-12" }))), ["checkOut"]);
  });

  it("rejects unknown statuses and more than 8 assigned rooms", () => {
    assert.ok(errorPaths(reservationSchema.safeParse(reservation({ status: "BOOKED" }))).includes("status"));
    assert.ok(errorPaths(reservationSchema.safeParse(reservation({ unitIds: Array(9).fill(ROOM) }))).includes("unitIds"));
  });
});
