import fs from "fs";
import path from "path";
import { db } from "../server/db";
import { productCategories } from "../shared/schema";
import { sql } from "drizzle-orm";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[&,]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface TaxonomyEntry {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  depth: number;
  path: string;
}

function parseTaxonomyFile(filePath: string): TaxonomyEntry[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim() && !l.startsWith("#"));

  const entries: TaxonomyEntry[] = [];
  const pathToId = new Map<string, number>();

  for (const line of lines) {
    const dashIdx = line.indexOf(" - ");
    if (dashIdx === -1) continue;

    const id = parseInt(line.substring(0, dashIdx).trim(), 10);
    const fullPath = line.substring(dashIdx + 3).trim();

    if (isNaN(id)) continue;

    const parts = fullPath.split(" > ");
    const name = parts[parts.length - 1];
    const depth = parts.length;

    let parentId: number | null = null;
    if (parts.length > 1) {
      const parentPath = parts.slice(0, -1).join(" > ");
      parentId = pathToId.get(parentPath) ?? null;
    }

    pathToId.set(fullPath, id);

    entries.push({
      id,
      name,
      slug: slugify(name),
      parentId,
      depth,
      path: fullPath,
    });
  }

  return entries;
}

function getCustomSectorCategories(): TaxonomyEntry[] {
  const categories: TaxonomyEntry[] = [
    { id: 100001, name: "Food Services", slug: "food-services", parentId: null, depth: 1, path: "Food Services" },
    { id: 100002, name: "Restaurant Delivery", slug: "restaurant-delivery", parentId: 100001, depth: 2, path: "Food Services > Restaurant Delivery" },
    { id: 100003, name: "Meal Kits", slug: "meal-kits", parentId: 100001, depth: 2, path: "Food Services > Meal Kits" },
    { id: 100004, name: "Catering", slug: "catering", parentId: 100001, depth: 2, path: "Food Services > Catering" },
    { id: 100005, name: "Grocery Delivery", slug: "grocery-delivery", parentId: 100001, depth: 2, path: "Food Services > Grocery Delivery" },
    { id: 100006, name: "Ghost Kitchens", slug: "ghost-kitchens", parentId: 100001, depth: 2, path: "Food Services > Ghost Kitchens" },
    { id: 100007, name: "Coffee & Beverage", slug: "coffee-beverage", parentId: 100001, depth: 2, path: "Food Services > Coffee & Beverage" },
    { id: 100008, name: "Bakery & Desserts", slug: "bakery-desserts", parentId: 100001, depth: 2, path: "Food Services > Bakery & Desserts" },

    { id: 100010, name: "Travel", slug: "travel", parentId: null, depth: 1, path: "Travel" },
    { id: 100011, name: "Flights", slug: "flights", parentId: 100010, depth: 2, path: "Travel > Flights" },
    { id: 100012, name: "Hotels & Lodging", slug: "hotels-lodging", parentId: 100010, depth: 2, path: "Travel > Hotels & Lodging" },
    { id: 100013, name: "Car Rental", slug: "car-rental", parentId: 100010, depth: 2, path: "Travel > Car Rental" },
    { id: 100014, name: "Cruises", slug: "cruises", parentId: 100010, depth: 2, path: "Travel > Cruises" },
    { id: 100015, name: "Tours & Activities", slug: "tours-activities", parentId: 100010, depth: 2, path: "Travel > Tours & Activities" },
    { id: 100016, name: "Travel Insurance", slug: "travel-insurance", parentId: 100010, depth: 2, path: "Travel > Travel Insurance" },
    { id: 100017, name: "Vacation Rentals", slug: "vacation-rentals", parentId: 100010, depth: 2, path: "Travel > Vacation Rentals" },

    { id: 100020, name: "Education", slug: "education", parentId: null, depth: 1, path: "Education" },
    { id: 100021, name: "Online Courses", slug: "online-courses", parentId: 100020, depth: 2, path: "Education > Online Courses" },
    { id: 100022, name: "Tutoring", slug: "tutoring", parentId: 100020, depth: 2, path: "Education > Tutoring" },
    { id: 100023, name: "Certifications", slug: "certifications", parentId: 100020, depth: 2, path: "Education > Certifications" },
    { id: 100024, name: "Educational Materials", slug: "educational-materials", parentId: 100020, depth: 2, path: "Education > Educational Materials" },
    { id: 100025, name: "Test Prep", slug: "test-prep", parentId: 100020, depth: 2, path: "Education > Test Prep" },
    { id: 100026, name: "Language Learning", slug: "language-learning", parentId: 100020, depth: 2, path: "Education > Language Learning" },

    { id: 100030, name: "Events", slug: "events", parentId: null, depth: 1, path: "Events" },
    { id: 100031, name: "Concert Tickets", slug: "concert-tickets", parentId: 100030, depth: 2, path: "Events > Concert Tickets" },
    { id: 100032, name: "Sports Tickets", slug: "sports-tickets", parentId: 100030, depth: 2, path: "Events > Sports Tickets" },
    { id: 100033, name: "Conferences", slug: "conferences", parentId: 100030, depth: 2, path: "Events > Conferences" },
    { id: 100034, name: "Festivals", slug: "festivals", parentId: 100030, depth: 2, path: "Events > Festivals" },
    { id: 100035, name: "Theater & Shows", slug: "theater-shows", parentId: 100030, depth: 2, path: "Events > Theater & Shows" },
    { id: 100036, name: "Workshops & Classes", slug: "workshops-classes", parentId: 100030, depth: 2, path: "Events > Workshops & Classes" },

    { id: 100040, name: "Luxury", slug: "luxury", parentId: null, depth: 1, path: "Luxury" },
    { id: 100041, name: "Luxury Fashion", slug: "luxury-fashion", parentId: 100040, depth: 2, path: "Luxury > Luxury Fashion" },
    { id: 100042, name: "Fine Jewelry", slug: "fine-jewelry", parentId: 100040, depth: 2, path: "Luxury > Fine Jewelry" },
    { id: 100043, name: "Luxury Watches", slug: "luxury-watches", parentId: 100040, depth: 2, path: "Luxury > Luxury Watches" },
    { id: 100044, name: "Luxury Home", slug: "luxury-home", parentId: 100040, depth: 2, path: "Luxury > Luxury Home" },
    { id: 100045, name: "Luxury Automotive", slug: "luxury-automotive", parentId: 100040, depth: 2, path: "Luxury > Luxury Automotive" },
    { id: 100046, name: "Luxury Beauty", slug: "luxury-beauty", parentId: 100040, depth: 2, path: "Luxury > Luxury Beauty" },

    { id: 100050, name: "Specialty", slug: "specialty", parentId: null, depth: 1, path: "Specialty" },
    { id: 100051, name: "General Specialty", slug: "general-specialty", parentId: 100050, depth: 2, path: "Specialty > General Specialty" },
    { id: 100052, name: "Subscription Services", slug: "subscription-services", parentId: 100050, depth: 2, path: "Specialty > Subscription Services" },
    { id: 100053, name: "Custom & Personalized", slug: "custom-personalized", parentId: 100050, depth: 2, path: "Specialty > Custom & Personalized" },
    { id: 100054, name: "Marketplace & Platform", slug: "marketplace-platform", parentId: 100050, depth: 2, path: "Specialty > Marketplace & Platform" },
    { id: 100055, name: "Rental & Lease", slug: "rental-lease", parentId: 100050, depth: 2, path: "Specialty > Rental & Lease" },
  ];

  return categories;
}

async function main() {
  const taxonomyPath = path.join(process.cwd(), "data", "google-product-taxonomy.txt");

  if (!fs.existsSync(taxonomyPath)) {
    console.error(`Taxonomy file not found at ${taxonomyPath}`);
    process.exit(1);
  }

  console.log("Parsing Google Product Taxonomy...");
  const googleEntries = parseTaxonomyFile(taxonomyPath);
  console.log(`Parsed ${googleEntries.length} Google categories`);

  const customEntries = getCustomSectorCategories();
  console.log(`Adding ${customEntries.length} custom sector categories`);

  const allEntries = [...googleEntries, ...customEntries];

  const existing = await db.select({ count: sql<number>`count(*)::int` }).from(productCategories);
  const existingCount = existing[0]?.count ?? 0;

  if (existingCount > 0) {
    console.log(`Table already has ${existingCount} rows. Truncating...`);
    await db.delete(productCategories);
  }

  const BATCH_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < allEntries.length; i += BATCH_SIZE) {
    const batch = allEntries.slice(i, i + BATCH_SIZE);
    await db.insert(productCategories).values(batch);
    inserted += batch.length;
    console.log(`  Inserted ${inserted}/${allEntries.length}`);
  }

  const maxId = Math.max(...allEntries.map((e) => e.id));
  await db.execute(sql`SELECT setval(pg_get_serial_sequence('product_categories', 'id'), ${maxId})`);

  console.log(`Done. ${inserted} categories loaded (sequence reset to ${maxId}).`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
