// SecureFill — profiles (schema tables).
//
// A profile is a CURATED, non-fuzzy mapping used for two jobs:
//   1. canonicalize(name): map a requested field name to the canonical record
//      key, so a caller may use any listed alias for a token and still resolve
//      the same stored value.
//   2. detectAliases(key): a short list of SPECIFIC DOM tokens (standard
//      autocomplete values + common name/id strings) to try when locating the
//      field on the page. These are tried as exact attribute matches, not broad
//      substrings, so they improve match rate without wrong-field risk.
//
// This is data, not logic. Adding a use case = adding an entry. The extension
// stays value-type agnostic: any token with no profile entry still resolves via
// the generic detector.

// canonical key -> specific DOM candidates (autocomplete values first).
const SCHEMAS = {
  number:    ["cc-number", "cardnumber", "card_number", "card-number", "number"],
  cvv:       ["cc-csc", "verification_value", "cvc", "cvv", "csc", "security_code"],
  name:      ["cc-name", "ccname", "cardholder", "cardholder_name", "name"],
  exp_month: ["cc-exp-month", "exp_month", "expmonth", "exp-month"],
  exp_year:  ["cc-exp-year", "exp_year", "expyear", "exp-year"],
  address:   ["address-line1", "street-address", "addr1", "address1", "address"],
  city:      ["address-level2", "city", "locality"],
  state:     ["address-level1", "state", "region", "province"],
  zip:       ["postal-code", "zip", "postcode", "postal", "zipcode"],
  country:   ["country", "country-name", "countryCode"],
  username:  ["username", "email", "user", "login", "user_name"],
  password:  ["current-password", "password", "pass", "passwd"],
};

// Reverse index: any alias -> canonical key. Lets a requested field name that
// is really an alias (e.g. "verification_value") resolve to the record key.
const ALIAS_TO_KEY = (() => {
  const m = {};
  for (const [key, aliases] of Object.entries(SCHEMAS)) {
    m[key] = key;
    for (const a of aliases) if (!(a in m)) m[a] = key;
  }
  return m;
})();

// Named profiles: which canonical tokens a source of this kind exposes. This is
// the list the driving agent introspects (names only, no values) so it knows
// what it is mapping to page fields. Ordered most-important first.
export const PROFILES = {
  card: ["number", "cvv", "exp_month", "exp_year", "name"],
  address: ["name", "address", "city", "state", "zip", "country"],
  login: ["username", "password"],
};

export function profileTokens(profile) {
  return PROFILES[profile] ? PROFILES[profile].slice() : [];
}

export function canonicalize(name) {
  const n = String(name || "").toLowerCase().trim();
  return ALIAS_TO_KEY[n] || name;
}

export function detectAliases(key) {
  return SCHEMAS[key] ? SCHEMAS[key].slice() : [];
}

// Fields that are safe to echo back to the page (non-secret), e.g. for separate
// same-origin expiry dropdowns.
export const META_ALLOWLIST = ["exp_month", "exp_year"];
