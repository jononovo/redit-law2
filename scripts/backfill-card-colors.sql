-- Backfill card_color for existing cards that don't have one set.
-- Assigns colors based on a hash of the card_id for deterministic results.
-- Safe to run multiple times — only updates rows where card_color IS NULL.
--
-- Usage: psql $DATABASE_URL -f scripts/backfill-card-colors.sql

BEGIN;

-- Rail 5 cards
UPDATE rail5_cards
SET card_color = CASE abs(hashtext(card_id)) % 4
  WHEN 0 THEN 'purple'
  WHEN 1 THEN 'dark'
  WHEN 2 THEN 'blue'
  WHEN 3 THEN 'primary'
END
WHERE card_color IS NULL;

-- Rail 4 cards
UPDATE rail4_cards
SET card_color = CASE abs(hashtext(card_id)) % 4
  WHEN 0 THEN 'purple'
  WHEN 1 THEN 'dark'
  WHEN 2 THEN 'blue'
  WHEN 3 THEN 'primary'
END
WHERE card_color IS NULL;

COMMIT;

-- Verify: should return 0 rows
SELECT 'rail5_cards' AS table_name, COUNT(*) AS null_count FROM rail5_cards WHERE card_color IS NULL
UNION ALL
SELECT 'rail4_cards', COUNT(*) FROM rail4_cards WHERE card_color IS NULL;
