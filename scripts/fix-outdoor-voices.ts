import { Pool } from "pg";
const prod = new Pool({ connectionString: process.argv[2] });
async function main() {
  await prod.query("UPDATE product_listings SET brand_id = 173 WHERE brand_id = 163");
  console.log("Moved 367 products to ID 173");
  await prod.query("DELETE FROM brand_categories WHERE brand_id = 163");
  console.log("Removed stale brand_categories");
  await prod.query("DELETE FROM brand_index WHERE id = 163");
  console.log("Deleted stale brand entry");
  const { rows } = await prod.query("SELECT id, name, domain, (SELECT count(*) FROM product_listings pl WHERE pl.brand_id = brand_index.id) as products, (SELECT count(*) FROM brand_categories bc WHERE bc.brand_id = brand_index.id) as categories FROM brand_index WHERE name ILIKE '%outdoor%'");
  console.log("Result:", rows);
  await prod.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
