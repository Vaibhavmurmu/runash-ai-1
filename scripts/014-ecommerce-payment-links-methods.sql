-- E-commerce payment page backing tables (v1 API)
CREATE TABLE IF NOT EXISTS public.ecommerce_payment_links (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  link TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ecommerce_payment_methods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  icon TEXT NOT NULL,
  connected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.ecommerce_payment_methods (id, name, provider, icon, connected)
VALUES
  ('card', 'Credit/Debit Card', 'Visa, Mastercard, Amex', '💳', true),
  ('stripe', 'Stripe Payment', 'Stripe Connect', '🔗', true),
  ('paypal', 'PayPal', 'PayPal Commerce', '🅿️', true),
  ('crypto', 'Cryptocurrency', 'Bitcoin, Ethereum', '₿', false)
ON CONFLICT (id) DO NOTHING;
