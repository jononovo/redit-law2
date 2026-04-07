DROP TABLE IF EXISTS rail5_transactions;
DROP TABLE IF EXISTS rail5_wallets;

UPDATE master_guardrails
SET approval_mode = 'ask_for_everything'
WHERE approval_mode = 'auto_approve_by_category';

UPDATE bots
SET default_rail = NULL
WHERE default_rail = 'card_wallet';
