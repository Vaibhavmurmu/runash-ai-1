-- Backfill strategy for seeded in-memory demo wallet data.
-- Safe to rerun; inserts only when records are missing.

INSERT INTO wallet_cards (
  id,
  user_id,
  holder_name,
  tokenized_payment_reference,
  brand,
  last4,
  exp_month,
  exp_year,
  billing_address_encrypted,
  is_default
)
SELECT
  'card_demo_1',
  'demo-user',
  'RunAsh User',
  'tok_demo_seed_1',
  'visa',
  '4242',
  12,
  2028,
  NULL,
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM wallet_cards WHERE id = 'card_demo_1'
);

INSERT INTO wallet_subscription_snapshots (
  id,
  user_id,
  plan,
  status,
  next_billing_date,
  amount,
  currency
)
SELECT
  'sub_demo_1',
  'demo-user',
  'RunAsh Pro',
  'active',
  NOW() + INTERVAL '14 days',
  29,
  'USD'
WHERE NOT EXISTS (
  SELECT 1 FROM wallet_subscription_snapshots WHERE id = 'sub_demo_1'
);
