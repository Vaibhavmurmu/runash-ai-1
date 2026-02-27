CREATE TABLE IF NOT EXISTS accounting_chart_of_accounts (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS accounting_chart_of_accounts_type_idx ON accounting_chart_of_accounts (account_type);

CREATE TABLE IF NOT EXISTS accounting_ledger_entries (
  id UUID PRIMARY KEY,
  entry_date DATE NOT NULL,
  voucher_code TEXT NOT NULL,
  account_code TEXT NOT NULL,
  debit NUMERIC(14, 2) NOT NULL DEFAULT 0,
  credit NUMERIC(14, 2) NOT NULL DEFAULT 0,
  narration TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT accounting_ledger_entries_account_fk FOREIGN KEY (account_code)
    REFERENCES accounting_chart_of_accounts(code)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS accounting_ledger_entries_date_idx ON accounting_ledger_entries (entry_date DESC);
CREATE INDEX IF NOT EXISTS accounting_ledger_entries_voucher_idx ON accounting_ledger_entries (voucher_code);

CREATE TABLE IF NOT EXISTS accounting_reconciliation_items (
  id UUID PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  tax_period TEXT NOT NULL,
  status TEXT NOT NULL,
  book_tax NUMERIC(14, 2) NOT NULL DEFAULT 0,
  gst_portal_tax NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS accounting_reconciliation_period_idx ON accounting_reconciliation_items (tax_period, status);

CREATE TABLE IF NOT EXISTS accounting_counterparties (
  id UUID PRIMARY KEY,
  entity_type TEXT NOT NULL,
  name TEXT NOT NULL,
  gstin TEXT,
  outstanding NUMERIC(14, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS accounting_counterparties_type_idx ON accounting_counterparties (entity_type, is_active);
