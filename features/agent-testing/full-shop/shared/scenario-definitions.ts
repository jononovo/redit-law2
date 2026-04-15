import type { ShopProduct, FullShopScenarioConfig } from "./types";

export const SHOP_PRODUCT_CATALOG: ShopProduct[] = [
  {
    slug: "urban-runner-x",
    name: "Urban Runner X",
    category: "sneakers",
    searchTerm: "sneakers",
    price: 8999,
    colors: ["Black", "Blue", "Red"],
    sizes: ["7", "8", "9", "10", "11"],
    description:
      "Lightweight urban running shoes with responsive cushioning and breathable mesh upper.",
  },
  {
    slug: "cloud-step-elite",
    name: "Cloud Step Elite",
    category: "sneakers",
    searchTerm: "sneakers",
    price: 12499,
    colors: ["White", "Green", "Navy"],
    sizes: ["7", "8", "9", "10", "11"],
    description:
      "Premium cloud-like comfort with adaptive foam technology for all-day wear.",
  },
  {
    slug: "street-pulse-max",
    name: "Street Pulse Max",
    category: "sneakers",
    searchTerm: "sneakers",
    price: 10999,
    colors: ["Black", "Orange", "Blue"],
    sizes: ["7", "8", "9", "10", "11"],
    description:
      "Bold street-style sneakers with maximum impact protection and grippy outsole.",
  },
  {
    slug: "alpine-fleece-pro",
    name: "Alpine Fleece Pro",
    category: "hoodie",
    searchTerm: "hoodie",
    price: 6499,
    colors: ["Red", "Black", "Gray"],
    sizes: ["S", "M", "L", "XL"],
    description:
      "Heavy-weight fleece hoodie with alpine-inspired design and kangaroo pocket.",
  },
  {
    slug: "urban-crest-zip",
    name: "Urban Crest Zip",
    category: "hoodie",
    searchTerm: "hoodie",
    price: 7499,
    colors: ["Navy", "Green", "White"],
    sizes: ["S", "M", "L", "XL"],
    description:
      "Full-zip hoodie with embroidered crest logo and moisture-wicking interior.",
  },
  {
    slug: "night-owl-pullover",
    name: "Night Owl Pullover",
    category: "hoodie",
    searchTerm: "hoodie",
    price: 5499,
    colors: ["Black", "Charcoal", "Blue"],
    sizes: ["S", "M", "L", "XL"],
    description:
      "Cozy pullover hoodie with oversized hood and reflective owl graphic.",
  },
  {
    slug: "trail-blazer-40l",
    name: "Trail Blazer 40L",
    category: "backpack",
    searchTerm: "backpack",
    price: 13999,
    colors: ["Black", "Green", "Orange"],
    sizes: ["S", "M", "L"],
    description:
      "Rugged 40-liter hiking backpack with hydration sleeve and rain cover.",
  },
  {
    slug: "metro-commuter-25l",
    name: "Metro Commuter 25L",
    category: "backpack",
    searchTerm: "backpack",
    price: 8999,
    colors: ["Gray", "Navy", "Red"],
    sizes: ["S", "M", "L"],
    description:
      "Sleek commuter backpack with padded laptop sleeve and anti-theft pocket.",
  },
  {
    slug: "summit-pack-55l",
    name: "Summit Pack 55L",
    category: "backpack",
    searchTerm: "backpack",
    price: 17999,
    colors: ["Blue", "Black", "Olive"],
    sizes: ["S", "M", "L"],
    description:
      "Expedition-grade 55-liter pack with adjustable suspension and load lifters.",
  },
];

export type ScenarioTemplate = Omit<
  FullShopScenarioConfig,
  "expectedShippingAddress" | "expectedCardDetails"
>;

export const FULL_SHOP_SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  {
    scenarioId: "scenario_1",
    expectedSearchTerm: "sneakers",
    expectedProductSlug: "urban-runner-x",
    expectedProductName: "Urban Runner X",
    expectedColor: "Blue",
    expectedSize: "9",
    expectedQuantity: 3,
    expectedShippingMethod: "standard",
    expectedPaymentMethod: "credit_card",
  },
  {
    scenarioId: "scenario_2",
    expectedSearchTerm: "hoodie",
    expectedProductSlug: "alpine-fleece-pro",
    expectedProductName: "Alpine Fleece Pro",
    expectedColor: "Red",
    expectedSize: "L",
    expectedQuantity: 2,
    expectedShippingMethod: "priority",
    expectedPaymentMethod: "credit_card",
  },
  {
    scenarioId: "scenario_3",
    expectedSearchTerm: "backpack",
    expectedProductSlug: "trail-blazer-40l",
    expectedProductName: "Trail Blazer 40L",
    expectedColor: "Black",
    expectedSize: "M",
    expectedQuantity: 1,
    expectedShippingMethod: "standard",
    expectedPaymentMethod: "credit_card",
  },
  {
    scenarioId: "scenario_4",
    expectedSearchTerm: "sneakers",
    expectedProductSlug: "cloud-step-elite",
    expectedProductName: "Cloud Step Elite",
    expectedColor: "Green",
    expectedSize: "10",
    expectedQuantity: 2,
    expectedShippingMethod: "priority",
    expectedPaymentMethod: "credit_card",
  },
];

export function buildInstructionText(
  scenario: FullShopScenarioConfig,
  testUrl: string
): string {
  const product = SHOP_PRODUCT_CATALOG.find(
    (p) => p.slug === scenario.expectedProductSlug
  );
  const categoryLabel = product?.category ?? "item";
  const addr = scenario.expectedShippingAddress;
  const card = scenario.expectedCardDetails;
  const shippingLabel =
    scenario.expectedShippingMethod === "priority" ? "Priority" : "Standard";

  return [
    "I want to see if you can shop. Do a test transaction using the test card details below.",
    "",
    `URL: ${testUrl}`,
    "",
    `Search for "${scenario.expectedSearchTerm}" to find the product.`,
    `Buy "${scenario.expectedProductName}" ${categoryLabel}, color ${scenario.expectedColor}, size ${scenario.expectedSize}, quantity ${scenario.expectedQuantity}.`,
    `Use ${shippingLabel} shipping.`,
    "Checkout with credit card.",
    "",
    "Shipping address:",
    addr.fullName,
    addr.street,
    `${addr.city}, ${addr.state} ${addr.zip}`,
    "",
    "Card details:",
    `Name: ${card.cardholderName}`,
    `Number: ${formatCardNumberForDisplay(card.cardNumber)}`,
    `Expiry: ${card.cardExpiry}`,
    `CVV: ${card.cardCvv}`,
  ].join("\n");
}

function formatCardNumberForDisplay(num: string): string {
  const digits = num.replace(/\D/g, "");
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

export function getProductBySlug(slug: string): ShopProduct | undefined {
  return SHOP_PRODUCT_CATALOG.find((p) => p.slug === slug);
}

export function searchProducts(query: string): ShopProduct[] {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return [];
  return SHOP_PRODUCT_CATALOG.filter(
    (p) => p.searchTerm === normalized || p.name.toLowerCase().includes(normalized)
  );
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
