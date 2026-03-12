export interface MerchantProduct {
  name: string;
  minCents: number;
  maxCents: number;
}

export interface Merchant {
  name: string;
  slug: string;
  category: string;
  products: MerchantProduct[];
}

export const MERCHANT_CATALOG: Merchant[] = [
  {
    name: "The Real Etsy Checkout",
    slug: "real-etsy-checkout",
    category: "marketplace",
    products: [
      { name: "Handmade Ceramic Mug", minCents: 1800, maxCents: 3500 },
      { name: "Embroidered Iron-On Patch", minCents: 400, maxCents: 1200 },
      { name: "Brass Candleholder", minCents: 2200, maxCents: 4500 },
      { name: "Leather Keychain", minCents: 800, maxCents: 2000 },
    ],
  },
  {
    name: "Amazon Verified Merchant",
    slug: "amazon-verified-merchant",
    category: "retail",
    products: [
      { name: "Wireless Bluetooth Earbuds", minCents: 1999, maxCents: 4999 },
      { name: "USB-C Charging Cable 6ft", minCents: 799, maxCents: 1499 },
      { name: "Insulated Water Bottle 32oz", minCents: 1299, maxCents: 2999 },
      { name: "LED Desk Lamp", minCents: 2499, maxCents: 5999 },
    ],
  },
  {
    name: "Official PayPal Purchase",
    slug: "official-paypal-purchase",
    category: "payments",
    products: [
      { name: "Digital Service Credit", minCents: 500, maxCents: 5000 },
      { name: "Subscription Renewal", minCents: 999, maxCents: 2999 },
      { name: "Platform Fee", minCents: 200, maxCents: 1500 },
    ],
  },
  {
    name: "Stripe Direct Payments",
    slug: "stripe-direct-payments",
    category: "payments",
    products: [
      { name: "API Usage Credit", minCents: 1000, maxCents: 5000 },
      { name: "Developer Plan Monthly", minCents: 2500, maxCents: 4999 },
      { name: "Webhook Relay Service", minCents: 500, maxCents: 2000 },
    ],
  },
  {
    name: "CloudServe Pro",
    slug: "cloudserve-pro",
    category: "saas",
    products: [
      { name: "Compute Instance Monthly", minCents: 500, maxCents: 8000 },
      { name: "Storage Expansion 100GB", minCents: 200, maxCents: 2000 },
      { name: "CDN Bandwidth Pack", minCents: 1000, maxCents: 5000 },
      { name: "SSL Certificate Annual", minCents: 999, maxCents: 4999 },
    ],
  },
  {
    name: "Verified Google Services",
    slug: "verified-google-services",
    category: "saas",
    products: [
      { name: "Workspace Seat Monthly", minCents: 600, maxCents: 1800 },
      { name: "Cloud API Credits", minCents: 1000, maxCents: 10000 },
      { name: "Domain Registration", minCents: 1200, maxCents: 3500 },
    ],
  },
  {
    name: "SpicyThai Kitchen",
    slug: "spicythai-kitchen",
    category: "food",
    products: [
      { name: "Spicy Coconut PadThai", minCents: 1249, maxCents: 1899 },
      { name: "Green Curry Bowl", minCents: 1399, maxCents: 1999 },
      { name: "Mango Sticky Rice", minCents: 699, maxCents: 999 },
      { name: "Tom Yum Soup", minCents: 899, maxCents: 1499 },
    ],
  },
  {
    name: "DigitalOcean Marketplace",
    slug: "digitalocean-marketplace",
    category: "saas",
    products: [
      { name: "Droplet Credit Pack", minCents: 500, maxCents: 5000 },
      { name: "Managed Database Monthly", minCents: 1500, maxCents: 9900 },
      { name: "Load Balancer Monthly", minCents: 1000, maxCents: 3000 },
    ],
  },
  {
    name: "Authentic Shopify Store",
    slug: "authentic-shopify-store",
    category: "marketplace",
    products: [
      { name: "Cotton T-Shirt", minCents: 1999, maxCents: 3499 },
      { name: "Bamboo Phone Case", minCents: 1499, maxCents: 2999 },
      { name: "Eco-Friendly Tote Bag", minCents: 999, maxCents: 2499 },
    ],
  },
  {
    name: "Norton Security Direct",
    slug: "norton-security-direct",
    category: "software",
    products: [
      { name: "Antivirus License Annual", minCents: 2999, maxCents: 7999 },
      { name: "VPN Subscription Monthly", minCents: 499, maxCents: 1299 },
      { name: "Password Manager Annual", minCents: 1999, maxCents: 4999 },
    ],
  },
  {
    name: "Adobe Creative Hub",
    slug: "adobe-creative-hub",
    category: "software",
    products: [
      { name: "Stock Photo 10-Pack", minCents: 2999, maxCents: 7999 },
      { name: "Font License Perpetual", minCents: 1999, maxCents: 4999 },
      { name: "Cloud Storage Upgrade", minCents: 999, maxCents: 2999 },
    ],
  },
  {
    name: "FreshMart Grocery",
    slug: "freshmart-grocery",
    category: "food",
    products: [
      { name: "Organic Produce Box", minCents: 2499, maxCents: 4999 },
      { name: "Artisan Sourdough Bread", minCents: 599, maxCents: 1299 },
      { name: "Cold-Pressed Juice 6-Pack", minCents: 1499, maxCents: 2999 },
      { name: "Free-Range Eggs Dozen", minCents: 499, maxCents: 899 },
    ],
  },
];
