export const MODULE_NAME = "Scopey Rights";

export const RIGHTS_CONFIG = {
  expiringSoonWindowDays: 60,
  freeTierLicenseCap: 10,
  proTierLicenseCap: null,
  businessTierLicenseCap: null,
  reportingEnabledTiers: ["pro", "business"],
  usageTypes: {
    print: { label: "Print" },
    merchandise: { label: "Merchandise" },
    digital: { label: "Digital" },
    packaging: { label: "Packaging" },
    advertising: { label: "Advertising" },
    all_uses: { label: "All uses", overlapsAll: true }
  },
  territories: {
    worldwide: { label: "Worldwide", overlapsAll: true },
    uk: { label: "United Kingdom" },
    eu: { label: "European Union" },
    north_america: { label: "North America" }
  }
};

const INFINITY = Number.POSITIVE_INFINITY;

function normaliseDate(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;

  const date =
    value instanceof Date
      ? new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
      : new Date(`${value}T00:00:00.000Z`);
  const time = date.getTime();

  if (Number.isNaN(time)) {
    throw new Error(`Invalid date: ${value}`);
  }

  return time;
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd;
}

function valuesOverlap(valueA, valueB, lookup) {
  const entryA = lookup[valueA];
  const entryB = lookup[valueB];

  if (!entryA || !entryB) return false;
  if (valueA === valueB) return true;
  if (entryA.overlapsAll || entryB.overlapsAll) return true;

  return Boolean(
    entryA.overlapsWith?.includes(valueB) || entryB.overlapsWith?.includes(valueA)
  );
}

export function dateRangesOverlap(licenseA, licenseB) {
  const aStart = normaliseDate(licenseA.start_date);
  const bStart = normaliseDate(licenseB.start_date);
  const aEnd = normaliseDate(licenseA.end_date, INFINITY);
  const bEnd = normaliseDate(licenseB.end_date, INFINITY);

  return rangesOverlap(aStart, aEnd, bStart, bEnd);
}

export function territoriesOverlap(
  territoryA,
  territoryB,
  territories = RIGHTS_CONFIG.territories
) {
  return valuesOverlap(territoryA, territoryB, territories);
}

export function usageTypesOverlap(
  usageA,
  usageB,
  usageTypes = RIGHTS_CONFIG.usageTypes
) {
  return valuesOverlap(usageA, usageB, usageTypes);
}

export function validateLicenseInput(license) {
  const missing = [];

  if (!license?.client_name?.trim?.()) missing.push("client_name");
  if (!license?.usage_type) missing.push("usage_type");
  if (!license?.territory) missing.push("territory");
  if (!license?.start_date) missing.push("start_date");

  if (missing.length) {
    return { valid: false, errors: missing.map((field) => `${field} is required`) };
  }

  if (license.end_date) {
    const start = normaliseDate(license.start_date);
    const end = normaliseDate(license.end_date);

    if (end < start) {
      return {
        valid: false,
        errors: ["end_date must be on or after start_date"]
      };
    }
  }

  return { valid: true, errors: [] };
}

export function findConflicts(newLicense, existingLicenses = [], config = RIGHTS_CONFIG) {
  const validation = validateLicenseInput(newLicense);

  if (!validation.valid) {
    throw new Error(`Invalid license: ${validation.errors.join(", ")}`);
  }

  return existingLicenses
    .filter((existing) => !newLicense.id || existing.id !== newLicense.id)
    .filter((existing) => {
      if (!newLicense.exclusive && !existing.exclusive) return false;
      if (!dateRangesOverlap(newLicense, existing)) return false;
      if (!territoriesOverlap(newLicense.territory, existing.territory, config.territories)) {
        return false;
      }
      if (!usageTypesOverlap(newLicense.usage_type, existing.usage_type, config.usageTypes)) {
        return false;
      }
      return true;
    })
    .map((license) => ({
      license,
      reasons: {
        exclusive: Boolean(newLicense.exclusive || license.exclusive),
        dateRange: true,
        territory: true,
        usageType: true
      }
    }));
}

export function isLicenseActive(license, today = new Date()) {
  const current = normaliseDate(today instanceof Date ? today : String(today));
  const start = normaliseDate(license.start_date);
  const end = normaliseDate(license.end_date, INFINITY);

  return start <= current && current <= end;
}

export function isLicenseExpiringSoon(
  license,
  today = new Date(),
  windowDays = RIGHTS_CONFIG.expiringSoonWindowDays
) {
  if (!license.end_date) return false;

  const current = normaliseDate(today instanceof Date ? today : String(today));
  const end = normaliseDate(license.end_date);
  const windowMs = windowDays * 24 * 60 * 60 * 1000;

  return current <= end && end <= current + windowMs;
}

export async function parseContractWithAI() {
  throw new Error("Not implemented");
}
