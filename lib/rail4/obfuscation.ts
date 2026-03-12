import type { ProfilePermission } from "@/shared/schema";

const DECOY_FILENAMES = [
  "extricate", "kaleidoscope", "labyrinth", "nebula", "quasar",
  "serenade", "verdant", "wisteria", "zenith", "aurora",
  "cascade", "drifter", "eclipse", "fathom", "glacier",
  "horizon", "inferno", "jubilee", "kinetic", "luminous",
  "meridian", "nocturne", "obsidian", "paradox", "quantum",
  "radiance", "solstice", "tempest", "umbra", "vortex",
  "whisper", "xanthic", "yearning", "zephyr", "alchemy",
  "brevity", "cipher", "dulcet", "enigma", "fractal",
  "gossamer", "halcyon", "idyllic", "juniper", "kismet",
  "lantern", "mosaic", "nimbus", "opulent", "prism",
];

const FIRST_NAMES = [
  "Sarah", "Michael", "Emily", "James", "Jessica",
  "Robert", "Amanda", "David", "Jennifer", "William",
  "Ashley", "Thomas", "Megan", "Christopher", "Elizabeth",
  "Daniel", "Nicole", "Matthew", "Stephanie", "Andrew",
];

const LAST_NAMES = [
  "Mitchell", "Anderson", "Thompson", "Williams", "Johnson",
  "Martinez", "Robinson", "Clark", "Lewis", "Walker",
  "Hall", "Young", "King", "Wright", "Scott",
  "Green", "Baker", "Adams", "Nelson", "Carter",
];

const MIDDLE_INITIALS = "ABCDEFGHJKLMNPRSTW";

const LOCATIONS = [
  { line1: "742 Oak Avenue", city: "Portland", state: "Oregon", zip: "97201" },
  { line1: "1455 Market Street", city: "San Francisco", state: "California", zip: "94103" },
  { line1: "215 Elm Drive", city: "Austin", state: "Texas", zip: "78701" },
  { line1: "830 Pine Road", city: "Denver", state: "Colorado", zip: "80202" },
  { line1: "567 Maple Lane", city: "Seattle", state: "Washington", zip: "98101" },
  { line1: "1200 Congress Ave", city: "Boston", state: "Massachusetts", zip: "02108" },
  { line1: "344 Cedar Blvd", city: "Chicago", state: "Illinois", zip: "60601" },
  { line1: "892 Birch Court", city: "Nashville", state: "Tennessee", zip: "37201" },
  { line1: "126 Willow Way", city: "Miami", state: "Florida", zip: "33101" },
  { line1: "478 Spruce Street", city: "Philadelphia", state: "Pennsylvania", zip: "19101" },
  { line1: "915 Ash Place", city: "Minneapolis", state: "Minnesota", zip: "55401" },
  { line1: "663 Hickory Drive", city: "Atlanta", state: "Georgia", zip: "30301" },
  { line1: "227 Cypress Lane", city: "Charlotte", state: "North Carolina", zip: "28201" },
  { line1: "551 Redwood Circle", city: "Phoenix", state: "Arizona", zip: "85001" },
  { line1: "789 Sycamore Ave", city: "San Diego", state: "California", zip: "92101" },
];

const APT_SUFFIXES = [
  "Apt 2A", "Apt 3B", "Apt 7A", "Apt 9B", "Apt 12C",
  "Suite 100", "Suite 205", "Unit 4", "Unit 8B", "#301",
  "#15", "Apt 1F", "Apt 5D", "Suite 410", "Unit 22",
];

const BIN_PREFIXES = ["4532", "4716", "5425", "4929", "5192", "4485", "4556", "5386"];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateCardNumber(bin: string, missingPositions: number[]): { full: string; masked: string } {
  let digits = bin;
  while (digits.length < 16) {
    digits += Math.floor(Math.random() * 10).toString();
  }
  let masked = "";
  for (let i = 0; i < 16; i++) {
    if (missingPositions.includes(i)) {
      masked += "x";
    } else {
      masked += digits[i];
    }
  }
  return { full: digits, masked };
}

function formatPan(raw: string): string {
  return `${raw.slice(0, 4)} ${raw.slice(4, 8)} ${raw.slice(8, 12)} ${raw.slice(12, 16)}`;
}

export interface FakeProfile {
  profileIndex: number;
  name: string;
  cardName: string;
  cardNumberMasked: string;
  cvv: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  fakeMissingDigits: string;
  fakeExpiryMonth: number;
  fakeExpiryYear: number;
}

export interface Rail4Setup {
  decoyFilename: string;
  realProfileIndex: number;
  missingDigitPositions: number[];
  fakeProfiles: FakeProfile[];
  profilePermissions: ProfilePermission[];
  decoyFileContent: string;
}

function generateFakePermission(profileIndex: number): ProfilePermission {
  const durations: Array<"day" | "week" | "month"> = ["day", "week", "month"];
  const duration = randomPick(durations);

  let value: number;
  switch (duration) {
    case "day": value = randomInt(10, 40); break;
    case "week": value = randomInt(30, 150); break;
    case "month": value = randomInt(100, 500); break;
  }

  return {
    profile_index: profileIndex,
    allowance_duration: duration,
    allowance_currency: "USD",
    allowance_value: value,
    confirmation_exempt_limit: 0,
    human_permission_required: "none",
    creditclaw_permission_required: "all",
  };
}

function generateRealPermissionDefaults(profileIndex: number): ProfilePermission {
  return {
    profile_index: profileIndex,
    allowance_duration: "week",
    allowance_currency: "USD",
    allowance_value: 50,
    confirmation_exempt_limit: 10,
    human_permission_required: "all",
    creditclaw_permission_required: "all",
  };
}

export function generateRail4Setup(): Rail4Setup {
  const decoyFilename = randomPick(DECOY_FILENAMES) + ".md";
  const realProfileIndex = randomInt(1, 6);
  const startPos = randomInt(7, 10);
  const missingDigitPositions = [startPos, startPos + 1, startPos + 2];

  const usedNames = new Set<string>();
  const usedLocations = new Set<number>();
  const fakeProfiles: FakeProfile[] = [];
  const profilePermissions: ProfilePermission[] = [];

  for (let i = 1; i <= 6; i++) {
    if (i === realProfileIndex) {
      profilePermissions.push(generateRealPermissionDefaults(i));
      continue;
    }

    let firstName: string, lastName: string, fullName: string;
    do {
      firstName = randomPick(FIRST_NAMES);
      lastName = randomPick(LAST_NAMES);
      fullName = `${firstName} ${lastName}`;
    } while (usedNames.has(fullName));
    usedNames.add(fullName);

    const middleInitial = randomPick([...MIDDLE_INITIALS]);
    const cardName = `${firstName} ${middleInitial}. ${lastName}`;

    let locIdx: number;
    do {
      locIdx = Math.floor(Math.random() * LOCATIONS.length);
    } while (usedLocations.has(locIdx) && usedLocations.size < LOCATIONS.length);
    usedLocations.add(locIdx);
    const loc = LOCATIONS[locIdx];

    const bin = randomPick(BIN_PREFIXES);
    const { masked } = generateCardNumber(bin, missingDigitPositions);
    const cvv = String(randomInt(100, 999));
    const fakeMissing = String(randomInt(100, 999));
    const fakeExpMonth = randomInt(1, 12);
    const fakeExpYear = randomInt(2026, 2032);

    const aptLine = randomPick(APT_SUFFIXES);

    fakeProfiles.push({
      profileIndex: i,
      name: fullName,
      cardName,
      cardNumberMasked: masked,
      cvv,
      addressLine1: loc.line1,
      addressLine2: aptLine,
      city: loc.city,
      state: loc.state,
      zip: loc.zip,
      country: "United States",
      fakeMissingDigits: fakeMissing,
      fakeExpiryMonth: fakeExpMonth,
      fakeExpiryYear: fakeExpYear,
    });

    profilePermissions.push(generateFakePermission(i));
  }

  const decoyFileContent = buildDecoyFileContent(
    realProfileIndex,
    missingDigitPositions,
    fakeProfiles,
    profilePermissions,
  );

  return {
    decoyFilename,
    realProfileIndex,
    missingDigitPositions,
    fakeProfiles,
    profilePermissions,
    decoyFileContent,
  };
}

export function buildDecoyFileContent(
  realProfileIndex: number,
  missingPositions: number[],
  fakeProfiles: FakeProfile[],
  permissions: ProfilePermission[],
  cardName: string = "Untitled Card",
): string {
  const lines: string[] = [];

  for (let i = 1; i <= 6; i++) {
    const perm = permissions.find(p => p.profile_index === i);

    if (i === realProfileIndex) {
      const maskedDigits = Array.from({ length: 16 }, (_, idx) =>
        missingPositions.includes(idx) ? "X" : "0"
      );
      const maskedPan = `${maskedDigits.slice(0, 4).join("")} ${maskedDigits.slice(4, 8).join("")} ${maskedDigits.slice(8, 12).join("")} ${maskedDigits.slice(12, 16).join("")}`;

      lines.push(`profile: ${i}`);
      lines.push(`---`);
      lines.push(`name_on_card: [Replace with name on card]`);
      lines.push(`card number: ${maskedPan}`);
      lines.push(`cvv: 000`);
      lines.push(`---`);
      lines.push(`address_line1: [Enter card address]`);
      lines.push(`city: `);
      lines.push(`state: `);
      lines.push(`zip: `);
      lines.push(`country: United States`);
      lines.push(`---`);
      if (perm) {
        lines.push(`allowance-duration: ${perm.allowance_duration}`);
        lines.push(`allowance-currency: ${perm.allowance_currency}`);
        lines.push(`allowance-value: ${perm.allowance_value}`);
        lines.push(`confirmation_exempt_limit: ${perm.confirmation_exempt_limit}`);
        lines.push(`human_permission_required: ${perm.human_permission_required}`);
        lines.push(`creditclaw_permission_required: ${perm.creditclaw_permission_required}`);
      }
      lines.push(`card-name: ${cardName}`);
      lines.push(``);
    } else {
      const fake = fakeProfiles.find(f => f.profileIndex === i)!;
      lines.push(`// Profile ${i}:`);
      lines.push(`profile: ${i}`);
      lines.push(`fullname: ${fake.name}`);
      lines.push(`address_line1: ${fake.addressLine1}`);
      lines.push(`address_line2: ${fake.addressLine2}`);
      lines.push(`city: ${fake.city}`);
      lines.push(`state: ${fake.state}`);
      lines.push(`zip: ${fake.zip}`);
      lines.push(`country: ${fake.country}`);
      if (perm) {
        lines.push(`allowance-duration: ${perm.allowance_duration}`);
        lines.push(`allowance-currency: ${perm.allowance_currency}`);
        lines.push(`allowance-value: ${perm.allowance_value}`);
        lines.push(`confirmation_exempt_limit: ${perm.confirmation_exempt_limit}`);
        lines.push(`human_permission_required: ${perm.human_permission_required}`);
        lines.push(`creditclaw_permission_required: ${perm.creditclaw_permission_required}`);
      }
      lines.push(`card-name: ${fake.cardName}`);
      lines.push(`pan: ${formatPan(fake.cardNumberMasked)}`);
      lines.push(`cvv: ${fake.cvv}`);
      lines.push(`expiry: xx/xx`);
      lines.push(``);
    }
  }

  return lines.join("\n");
}
