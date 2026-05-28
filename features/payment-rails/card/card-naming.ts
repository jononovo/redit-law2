export const FUN_CARD_NAMES = [
  "Titanium Claw",
  "Robo Platinum",
  "Agent Gold",
  "The Money Paw",
  "Claw Express",
  "Bot's Black Card",
  "Operation Checkout",
  "Stealth Card Alpha",
];

export function randomCardName() {
  return FUN_CARD_NAMES[Math.floor(Math.random() * FUN_CARD_NAMES.length)];
}
