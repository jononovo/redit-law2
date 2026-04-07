-- ============================================
-- Production: Migrate rail5_checkouts → rail5_transactions
-- Run AFTER Drizzle schema push is complete
-- ============================================

BEGIN;

-- Copy 27 checkout records into the new rail5_transactions table
INSERT INTO rail5_transactions (id, checkout_id, card_id, bot_id, owner_uid, merchant_name, merchant_url, item_name, amount_cents, category, status, key_delivered, confirmed_at, created_at, updated_at, balance_after)
SELECT id, checkout_id, card_id, bot_id, owner_uid, merchant_name, merchant_url, item_name, amount_cents, category, status, key_delivered, confirmed_at, created_at, updated_at, balance_after
FROM rail5_checkouts;

-- Fix the sequence
SELECT setval('rail5_transactions_id_seq', (SELECT COALESCE(MAX(id), 0) FROM rail5_transactions));

COMMIT;

-- Drop the old table
DROP TABLE IF EXISTS rail5_checkouts;

-- Drop the old wallet table if it still exists
DROP TABLE IF EXISTS rail5_wallets;
