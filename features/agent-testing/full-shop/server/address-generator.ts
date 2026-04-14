import type { ShippingAddress } from "../shared/types";

const FIRST_NAMES = [
  "Jordan", "Morgan", "Taylor", "Casey", "Riley", "Quinn", "Avery", "Harper",
  "Cameron", "Drew", "Skyler", "Parker", "Finley", "Reese", "Dakota", "Sage",
  "Rowan", "Hayden", "Emerson", "Kendall", "Blake", "Logan", "Alex", "Jamie",
];

const LAST_NAMES = [
  "Rivera", "Chen", "Patel", "Kim", "Johnson", "Williams", "Martinez", "Brown",
  "Singh", "Lee", "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Jackson",
  "White", "Harris", "Martin", "Garcia", "Clark", "Lewis", "Robinson", "Walker",
];

const STREETS = [
  "123 Main St", "456 Oak Ave", "789 Pine Rd", "321 Elm St", "654 Maple Dr",
  "987 Cedar Ln", "111 Birch Blvd", "222 Walnut St", "333 Cherry Way", "444 Spruce Ct",
  "555 Willow Ave", "666 Ash Rd", "777 Poplar Dr", "888 Cypress Ln", "999 Juniper St",
  "100 Magnolia Blvd", "200 Dogwood Way", "300 Hickory Ct", "400 Sycamore Ave", "500 Redwood Rd",
];

const CITY_STATE_ZIPS: [string, string, string][] = [
  ["New York", "NY", "10001"],
  ["Brooklyn", "NY", "11201"],
  ["Chicago", "IL", "60601"],
  ["Los Angeles", "CA", "90001"],
  ["San Francisco", "CA", "94102"],
  ["Austin", "TX", "78701"],
  ["Houston", "TX", "77001"],
  ["Miami", "FL", "33101"],
  ["Seattle", "WA", "98101"],
  ["Denver", "CO", "80201"],
  ["Portland", "OR", "97201"],
  ["Atlanta", "GA", "30301"],
  ["Boston", "MA", "02101"],
  ["Phoenix", "AZ", "85001"],
  ["Nashville", "TN", "37201"],
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateTestShippingAddress(): ShippingAddress {
  const [city, state, zip] = pick(CITY_STATE_ZIPS);
  return {
    fullName: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    street: pick(STREETS),
    city,
    state,
    zip,
  };
}
