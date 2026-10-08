import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { availabilityStatus, busyUnits, computeCategoryAvailability, eachNight, findConflicts, findOwnOverlap, overlaps, type ResLite } from "../src/lib/availability/core";

const STD = { id: "std", name: "Standard Room", totalUnits: 6 };
const SPC = { id: "spc", name: "Special Room", totalUnits: 2 };

let n = 0;
const res = (o: Partial<ResLite>): ResLite => ({
  id: `r${++n}`,
  roomId: "std",
  checkIn: "2026-06-10",
  checkOut: "2026-06-12",
  numberOfRooms: 1,
  status: "CONFIRMED",
  unitIds: [],
  ...o,
});

describe("date model", () => {
  it("a 10→12 June stay occupies the nights of 10 and 11 June only", () => {
    assert.deepEqual(eachNight("2026-06-10", "2026-06-12"), ["2026-06-10", "2026-06-11"]);
    const [std] = computeCategoryAvailability([STD], [res({ numberOfRooms: 6 })], "2026-06-12", "2026-06-13");
    assert.equal(std.available, 6, "room is available again on 12 June");
    const [std11] = computeCategoryAvailability([STD], [res({ numberOfRooms: 6 })], "2026-06-11", "2026-06-12");
    assert.equal(std11.available, 0);
  });

  it("back-to-back stays do not overlap (check-out day = next check-in day)", () => {
    assert.equal(overlaps("2026-06-10", "2026-06-12", "2026-06-12", "2026-06-14"), false);
    assert.equal(overlaps("2026-06-10", "2026-06-12", "2026-06-11", "2026-06-14"), true);
    assert.equal(overlaps("2026-06-10", "2026-06-12", "2026-06-08", "2026-06-10"), false);
    assert.equal(overlaps("2026-06-10", "2026-06-12", "2026-06-08", "2026-06-20"), true);
  });
});

describe("category availability", () => {
  it("partially available category (Standard: 6 total, 4 booked, 2 available → LIMITED)", () => {
    const rs = [res({ numberOfRooms: 2 }), res({ numberOfRooms: 1 }), res({ unitIds: ["u1"] })];
    const [std] = computeCategoryAvailability([STD], rs, "2026-06-10", "2026-06-11");
    assert.equal(std.total, 6);
    assert.equal(std.booked, 4);
    assert.equal(std.available, 2);
    assert.equal(std.status, "LIMITED");
  });

  it("fully booked category (Special: 2 total, 2 booked)", () => {
    const rs = [res({ roomId: "spc" }), res({ roomId: "spc", checkIn: "2026-06-09", checkOut: "2026-06-11" })];
    const [, spc] = computeCategoryAvailability([STD, SPC], rs, "2026-06-10", "2026-06-11");
    assert.equal(spc.booked, 2);
    assert.equal(spc.available, 0);
    assert.equal(spc.status, "FULLY_BOOKED");
  });

  it("cancelled, no-show and inquiry reservations are not counted", () => {
    const rs = ["CANCELLED", "NO_SHOW", "INQUIRY"].map((status) => res({ roomId: "spc", status }));
    const [spc] = computeCategoryAvailability([SPC], rs, "2026-06-10", "2026-06-11");
    assert.equal(spc.available, 2);
    assert.equal(spc.status, "AVAILABLE");
  });

  it("checked-out reservations stop counting after their checkout date", () => {
    const rs = [res({ roomId: "spc", status: "CHECKED_OUT", checkIn: "2026-06-08", checkOut: "2026-06-10" })];
    assert.equal(computeCategoryAvailability([SPC], rs, "2026-06-09", "2026-06-10")[0].available, 1);
    assert.equal(computeCategoryAvailability([SPC], rs, "2026-06-10", "2026-06-11")[0].available, 2);
  });

  it("a same-day check-out (0-night stay) does not occupy the room", () => {
    const rs = [res({ roomId: "spc", status: "CHECKED_OUT", checkIn: "2026-06-10", checkOut: "2026-06-10", unitIds: ["spc-1"] })];
    assert.equal(computeCategoryAvailability([SPC], rs, "2026-06-10", "2026-06-11")[0].available, 2);
    assert.deepEqual(findConflicts({ roomId: "spc", checkIn: "2026-06-10", checkOut: "2026-06-11", numberOfRooms: 1, status: "CONFIRMED", unitIds: ["spc-1"] }, rs, 2), []);
  });

  it("for a date range, availability is the worst night (a room must be free every night)", () => {
    const rs = [res({ roomId: "spc", checkIn: "2026-06-12", checkOut: "2026-06-13", numberOfRooms: 2 })];
    const [spc] = computeCategoryAvailability([SPC], rs, "2026-06-10", "2026-06-15");
    assert.equal(spc.available, 0);
    assert.deepEqual(spc.nights.map((x) => x.available), [2, 2, 0, 2, 2]);
  });

  it("uses the larger of rooms requested and rooms assigned", () => {
    const [std] = computeCategoryAvailability([STD], [res({ numberOfRooms: 1, unitIds: ["a", "b"] })], "2026-06-10", "2026-06-11");
    assert.equal(std.booked, 2);
  });

  it("status thresholds", () => {
    assert.equal(availabilityStatus(6, 6), "AVAILABLE");
    assert.equal(availabilityStatus(3, 6), "AVAILABLE");
    assert.equal(availabilityStatus(2, 6), "LIMITED");
    assert.equal(availabilityStatus(1, 2), "LIMITED");
    assert.equal(availabilityStatus(0, 2), "FULLY_BOOKED");
  });
});

describe("conflict protection", () => {
  const existing = [res({ id: "A", unitIds: ["std-1"], checkIn: "2026-06-10", checkOut: "2026-06-12" })];

  it("rejects the same physical room on overlapping dates", () => {
    const c = findConflicts({ roomId: "std", checkIn: "2026-06-11", checkOut: "2026-06-13", numberOfRooms: 1, status: "CONFIRMED", unitIds: ["std-1"] }, existing, 6);
    assert.equal(c.length, 1);
    assert.equal(c[0].kind, "unit");
  });

  it("allows the same room when dates only touch (different check-in/check-out)", () => {
    const c = findConflicts({ roomId: "std", checkIn: "2026-06-12", checkOut: "2026-06-14", numberOfRooms: 1, status: "CONFIRMED", unitIds: ["std-1"] }, existing, 6);
    assert.deepEqual(c, []);
  });

  it("allows a different room on the same dates", () => {
    const c = findConflicts({ roomId: "std", checkIn: "2026-06-10", checkOut: "2026-06-12", numberOfRooms: 1, status: "CONFIRMED", unitIds: ["std-2"] }, existing, 6);
    assert.deepEqual(c, []);
  });

  it("ignores conflicts with a cancelled reservation", () => {
    const cancelled = [{ ...existing[0], status: "CANCELLED" }];
    const c = findConflicts({ roomId: "std", checkIn: "2026-06-10", checkOut: "2026-06-12", numberOfRooms: 1, status: "CONFIRMED", unitIds: ["std-1"] }, cancelled, 6);
    assert.deepEqual(c, []);
  });

  it("a non-occupying candidate (inquiry/cancelled) never conflicts", () => {
    const c = findConflicts({ roomId: "std", checkIn: "2026-06-10", checkOut: "2026-06-12", numberOfRooms: 1, status: "CANCELLED", unitIds: ["std-1"] }, existing, 6);
    assert.deepEqual(c, []);
  });

  it("editing a reservation does not conflict with itself", () => {
    const c = findConflicts({ id: "A", roomId: "std", checkIn: "2026-06-10", checkOut: "2026-06-13", numberOfRooms: 1, status: "CONFIRMED", unitIds: ["std-1"] }, existing, 6);
    assert.deepEqual(c, []);
  });

  it("rejects over-booking a room type even without room assignment", () => {
    const full = [res({ roomId: "spc", numberOfRooms: 2 })];
    const c = findConflicts({ roomId: "spc", checkIn: "2026-06-11", checkOut: "2026-06-12", numberOfRooms: 1, status: "PENDING", unitIds: [] }, full, 2);
    assert.equal(c[0]?.kind, "capacity");
  });

  it("busyUnits lists occupied rooms for a range", () => {
    const b = busyUnits(existing, "2026-06-11", "2026-06-12");
    assert.deepEqual([...b.keys()], ["std-1"]);
    assert.equal(busyUnits(existing, "2026-06-12", "2026-06-13").size, 0);
  });
});

describe("one guest, one stay per night (findOwnOverlap)", () => {
  const stay = (id: string, checkIn: string, checkOut: string, status = "CONFIRMED") => ({ id, status, checkIn, checkOut });
  const existing = [stay("a", "2026-10-09", "2026-10-11")];

  it("blocks a second, overlapping stay for the same guest (the 9→11 + 10→11 bug)", () => {
    assert.equal(findOwnOverlap(existing, stay("new", "2026-10-10", "2026-10-11"))?.id, "a");
  });

  it("allows a back-to-back stay (room change on the check-out day)", () => {
    assert.equal(findOwnOverlap(existing, stay("new", "2026-10-11", "2026-10-13")), undefined);
  });

  it("allows extending a stay by editing it (it doesn't clash with itself)", () => {
    assert.equal(findOwnOverlap(existing, stay("a", "2026-10-09", "2026-10-14")), undefined);
  });

  it("blocks extending into the guest's next stay", () => {
    const two = [...existing, stay("b", "2026-10-12", "2026-10-13")];
    assert.equal(findOwnOverlap(two, stay("a", "2026-10-09", "2026-10-13"))?.id, "b");
  });

  it("ignores cancelled / no-show stays, and cancelling never counts as a clash", () => {
    assert.equal(findOwnOverlap([stay("a", "2026-10-09", "2026-10-11", "CANCELLED")], stay("new", "2026-10-10", "2026-10-11")), undefined);
    assert.equal(findOwnOverlap([stay("a", "2026-10-09", "2026-10-11", "NO_SHOW")], stay("new", "2026-10-10", "2026-10-11")), undefined);
    assert.equal(findOwnOverlap(existing, stay("new", "2026-10-10", "2026-10-11", "CANCELLED")), undefined);
  });
});
