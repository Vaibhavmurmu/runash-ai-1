ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_active_primary
  ON public.bank_accounts(user_id, is_active, is_primary);
