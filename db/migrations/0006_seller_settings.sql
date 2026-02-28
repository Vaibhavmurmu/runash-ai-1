-- Structured seller settings storage keyed by seller user id.
-- Keeps payload fields explicitly typed for migration away from users.bio.sellerSettings blob.

CREATE TABLE IF NOT EXISTS public.seller_settings (
  user_id TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL DEFAULT '',
  business_type TEXT NOT NULL DEFAULT 'organic-farm',
  description TEXT NOT NULL DEFAULT '',
  business_hours TEXT NOT NULL DEFAULT '',
  delivery_radius TEXT NOT NULL DEFAULT '',
  minimum_order TEXT NOT NULL DEFAULT '',
  return_policy TEXT NOT NULL DEFAULT '',
  payment_methods TEXT[] NOT NULL DEFAULT ARRAY['credit_card']::text[],
  shipping_options TEXT[] NOT NULL DEFAULT ARRAY['local_delivery']::text[],
  certifications TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_settings_updated_at
  ON public.seller_settings (updated_at DESC);
