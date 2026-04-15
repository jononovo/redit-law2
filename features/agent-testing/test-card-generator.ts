import type { ExpectedValues } from "./types";

const FIRST_NAMES = [
  "Jordan", "Morgan", "Taylor", "Casey", "Riley", "Quinn", "Avery", "Harper",
  "Cameron", "Drew", "Skyler", "Parker", "Finley", "Reese", "Dakota", "Sage",
  "Rowan", "Hayden", "Emerson", "Kendall", "Blake", "Logan", "Alex", "Jamie",
  "Peyton", "Charlie", "Sydney", "Devin", "Jesse", "Kai", "Robin", "Ellis",
  "Remy", "Arden", "Lane", "Shea", "Wren", "Scout", "Jules", "Lennon",
  "Phoenix", "Harley", "River", "Winter", "Sterling", "Cruz", "Eden", "Zion",
  "Milan", "Marlowe",
];

const LAST_NAMES = [
  "Rivera", "Chen", "Patel", "Kim", "Johnson", "Williams", "Martinez", "Brown",
  "Singh", "Lee", "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Jackson",
  "White", "Harris", "Martin", "Garcia", "Clark", "Lewis", "Robinson", "Walker",
  "Young", "Allen", "King", "Wright", "Lopez", "Hill", "Scott", "Green",
  "Adams", "Baker", "Nelson", "Carter", "Mitchell", "Perez", "Roberts", "Turner",
  "Phillips", "Campbell", "Parker", "Evans", "Edwards", "Collins", "Stewart",
  "Morris", "Reed", "Cook",
];

const MIDDLE_INITIALS = "ABCDEFGHJKLMNPRSTW";

const VALID_ZIPS = [
  "10001", "10002", "10003", "10004", "10005", "10006", "10007", "10009",
  "60601", "60602", "60603", "60604", "60605", "60606", "60607", "60608",
  "60610", "60611", "60612", "60613", "60614", "60615", "60616", "60617",
  "90001", "90002", "90003", "90004", "90005", "90006", "90007", "90008",
  "30301", "30302", "30303", "30305", "30306", "30307", "30308", "30309",
  "77001", "77002", "77003", "77004", "77005", "77006", "77007", "77008",
  "85001", "85003", "85004", "85006", "85007", "85008", "85009", "85012",
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDigits(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10).toString();
  return s;
}

function luhnCheckDigit(partial: string): string {
  const digits = partial.split("").map(Number);
  let sum = 0;
  let alt = true;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits[i];
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return String((10 - (sum % 10)) % 10);
}

function generateLuhnCardNumber(): string {
  const prefix = pick(["4", "4532", "4716", "4929"]);
  const bodyLength = 15 - prefix.length;
  const partial = prefix + randomDigits(bodyLength);
  return partial + luhnCheckDigit(partial);
}

function generateFutureExpiry(): string {
  const now = new Date();
  const yearsAhead = 1 + Math.floor(Math.random() * 4);
  const futureYear = now.getFullYear() + yearsAhead;
  const month = 1 + Math.floor(Math.random() * 12);
  const mm = String(month).padStart(2, "0");
  const yy = String(futureYear).slice(-2);
  return `${mm}/${yy}`;
}

export function generateTestCardData(): ExpectedValues {
  const first = pick(FIRST_NAMES);
  const initial = pick(MIDDLE_INITIALS.split(""));
  const last = pick(LAST_NAMES);

  return {
    cardholderName: `${first} ${initial}. ${last}`,
    cardNumber: generateLuhnCardNumber(),
    cardExpiry: generateFutureExpiry(),
    cardCvv: randomDigits(3),
    billingZip: pick(VALID_ZIPS),
  };
}
