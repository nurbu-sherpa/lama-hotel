import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BADGE, toneFor } from "../src/components/admin/ui";

describe("status tones", () => {
  it("lookups ignore case, spaces and hyphens", () => {
    assert.equal(toneFor("checked-in").tone, "active");
    assert.equal(toneFor(" Checked in ").tone, "active");
    assert.equal(toneFor("no_show").tone, "warning");
  });

  it("unknown statuses fall back to done", () => {
    assert.equal(toneFor("SOMETHING_ELSE").tone, "done");
  });

  it("Available and Confirmed no longer look alike", () => {
    assert.notEqual(toneFor("AVAILABLE").badge, toneFor("CONFIRMED").badge);
  });

  it("BADGE stays in sync with the tones", () => {
    for (const [status, cls] of Object.entries(BADGE)) assert.equal(cls, toneFor(status).badge);
  });
});
