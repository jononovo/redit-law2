import { MERCHANT_CATALOG, type Merchant, type MerchantProduct } from "./catalog";

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface GeneratedPurchaseOrder {
  merchantName: string;
  merchantSlug: string;
  merchantUrl: string;
  itemName: string;
  amountCents: number;
  category: string;
}

export function generatePurchaseOrder(excludeSlugs?: string[]): GeneratedPurchaseOrder {
  let availableMerchants = MERCHANT_CATALOG;
  if (excludeSlugs && excludeSlugs.length > 0) {
    const filtered = availableMerchants.filter(m => !excludeSlugs.includes(m.slug));
    if (filtered.length > 0) availableMerchants = filtered;
  }

  const merchant = randomPick(availableMerchants);
  const product = randomPick(merchant.products);
  const amountCents = randomInt(product.minCents, product.maxCents);

  return {
    merchantName: merchant.name,
    merchantSlug: merchant.slug,
    merchantUrl: `/merchant/${merchant.slug}`,
    itemName: product.name,
    amountCents,
    category: merchant.category,
  };
}

export function pickFakeProfileIndex(realProfileIndex: number): number {
  const fakeIndices = [1, 2, 3, 4, 5, 6].filter(i => i !== realProfileIndex);
  return randomPick(fakeIndices);
}
