-- Add optimistic-concurrency support for seller ecommerce entities.
ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS public.orders
  ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 0;

-- Query-performance indexes used by list/filter/search endpoints.
CREATE INDEX IF NOT EXISTS idx_products_user_updated_at ON public.products(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_name_search ON public.products(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_orders_user_updated_at ON public.orders(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_name_search ON public.orders(LOWER(buyer_name));
CREATE INDEX IF NOT EXISTS idx_orders_buyer_email_search ON public.orders(LOWER(buyer_email));
