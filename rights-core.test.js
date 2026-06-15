import test from "node:test";
import assert from "node:assert/strict";

import {
  MODULE_NAME,
  RIGHTS_CONFIG,
  dateRangesOverlap,
  findConflicts,
  isLicenseExpiringSoon,
  territoriesOverlap,
  usageTypesOverlap,
  validateLicenseInput
} from "./rights-core.js";

function license(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    client_name: "Client",
    usage_type: "print",
    territory: "uk",
    exclusive: false,
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    ...overrides
  };
}

test("module name is configurable from one export", () => {
  assert.equal(MODULE_NAME, "Scopey Rights");
});

test("non-overlapping date ranges do not conflict", () => {
  const existing = license({
    exclusive: true,
    start_date: "2026-01-01",
    end_date: "2026-01-31"
  });
  const incoming = license({
    exclusive: true,
    start_date: "2026-02-01",
    end_date: "2026-02-28"
  });

  assert.equal(dateRangesOverlap(existing, incoming), false);
  assert.equal(findConflicts(incoming, [existing]).length, 0);
});

test("overlapping dates with both licenses non-exclusive do not conflict", () => {
  const existing = license({ exclusive: false });
  const incoming = license({ exclusive: false });

  assert.equal(findConflicts(incoming, [existing]).length, 0);
});

test("overlapping dates, one exclusive, same territory and usage conflicts", () => {
  const existing = license({ client_name: "Studio A", exclusive: true });
  const incoming = license({ client_name: "Studio B", exclusive: false });

  const conflicts = findConflicts(incoming, [existing]);

  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].license.client_name, "Studio A");
});

test("open-ended existing license overlaps a future-dated license", () => {
  const existing = license({
    exclusive: true,
    start_date: "2026-01-01",
    end_date: null
  });
  const incoming = license({
    start_date: "2028-04-01",
    end_date: "2028-08-01"
  });

  assert.equal(findConflicts(incoming, [existing]).length, 1);
});

test("all_uses overlaps with a specific usage type", () => {
  const existing = license({
    exclusive: true,
    usage_type: "all_uses"
  });
  const incoming = license({
    usage_type: "merchandise"
  });

  assert.equal(usageTypesOverlap("all_uses", "merchandise"), true);
  assert.equal(findConflicts(incoming, [existing]).length, 1);
});

test("worldwide overlaps with any specific territory and vice versa", () => {
  const existing = license({
    exclusive: true,
    territory: "worldwide"
  });
  const incoming = license({
    territory: "north_america"
  });

  assert.equal(territoriesOverlap("worldwide", "uk"), true);
  assert.equal(territoriesOverlap("eu", "worldwide"), true);
  assert.equal(findConflicts(incoming, [existing]).length, 1);
});

test("sibling territories do not overlap in v1", () => {
  const existing = license({
    exclusive: true,
    territory: "eu"
  });
  const incoming = license({
    territory: "uk"
  });

  assert.equal(territoriesOverlap("uk", "eu"), false);
  assert.equal(findConflicts(incoming, [existing]).length, 0);
});

test("specific usage types do not overlap with each other", () => {
  const existing = license({
    exclusive: true,
    usage_type: "print"
  });
  const incoming = license({
    usage_type: "merchandise"
  });

  assert.equal(usageTypesOverlap("print", "merchandise"), false);
  assert.equal(findConflicts(incoming, [existing]).length, 0);
});

test("adjacent date ranges that do not share a day do not conflict", () => {
  const existing = license({
    exclusive: true,
    start_date: "2026-01-01",
    end_date: "2026-01-31"
  });
  const incoming = license({
    start_date: "2026-02-01",
    end_date: "2026-12-31"
  });

  assert.equal(findConflicts(incoming, [existing]).length, 0);
});

test("matching start/end boundary dates overlap", () => {
  const existing = license({
    exclusive: true,
    start_date: "2026-01-01",
    end_date: "2026-01-31"
  });
  const incoming = license({
    start_date: "2026-01-31",
    end_date: "2026-02-28"
  });

  assert.equal(findConflicts(incoming, [existing]).length, 1);
});

test("license validation rejects an end date before the start date", () => {
  const result = validateLicenseInput(
    license({
      start_date: "2026-04-01",
      end_date: "2026-03-31"
    })
  );

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, ["end_date must be on or after start_date"]);
});

test("expiring soon uses the configurable warning window", () => {
  const expiring = license({
    start_date: "2026-01-01",
    end_date: "2026-03-01"
  });

  assert.equal(isLicenseExpiringSoon(expiring, new Date("2026-01-15"), 60), true);
  assert.equal(isLicenseExpiringSoon(expiring, new Date("2026-01-15"), 30), false);
  assert.equal(RIGHTS_CONFIG.expiringSoonWindowDays, 60);
});
