-- Cleanup: remove the 5 test rows from each table
DELETE FROM product_listings WHERE id IN (1, 2, 3, 4, 5);
DELETE FROM brand_categories WHERE id IN (8, 9, 10, 11, 12);
DELETE FROM category_keywords WHERE id IN (161, 162, 163, 164, 165);
DELETE FROM product_categories WHERE id IN (1, 2, 3, 4, 5);
