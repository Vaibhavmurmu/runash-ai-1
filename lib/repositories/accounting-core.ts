import { queryMany, queryOne } from "@/lib/db"

let ready = false

const bootstrapStatements = [
  `CREATE TABLE IF NOT EXISTS accounting_chart_of_accounts (
    id UUID PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    account_type TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE INDEX IF NOT EXISTS accounting_chart_of_accounts_type_idx ON accounting_chart_of_accounts (account_type);`,
  `CREATE TABLE IF NOT EXISTS accounting_ledger_entries (
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
  );`,
  `CREATE INDEX IF NOT EXISTS accounting_ledger_entries_date_idx ON accounting_ledger_entries (entry_date DESC);`,
  `CREATE INDEX IF NOT EXISTS accounting_ledger_entries_voucher_idx ON accounting_ledger_entries (voucher_code);`,
  `CREATE TABLE IF NOT EXISTS accounting_reconciliation_items (
    id UUID PRIMARY KEY,
    invoice_number TEXT NOT NULL,
    tax_period TEXT NOT NULL,
    status TEXT NOT NULL,
    book_tax NUMERIC(14, 2) NOT NULL DEFAULT 0,
    gst_portal_tax NUMERIC(14, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE INDEX IF NOT EXISTS accounting_reconciliation_period_idx ON accounting_reconciliation_items (tax_period, status);`,
  `CREATE TABLE IF NOT EXISTS accounting_counterparties (
    id UUID PRIMARY KEY,
    entity_type TEXT NOT NULL,
    name TEXT NOT NULL,
    gstin TEXT,
    outstanding NUMERIC(14, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE INDEX IF NOT EXISTS accounting_counterparties_type_idx ON accounting_counterparties (entity_type, is_active);`,
]

const seedStatements = [
  `INSERT INTO accounting_chart_of_accounts (id, code, name, account_type, currency, balance)
   SELECT md5(random()::text || clock_timestamp()::text)::uuid, s.code, s.name, s.account_type, 'INR', s.balance::numeric
   FROM (
      VALUES
      ('1001', 'Cash in Hand', 'Asset', 25000.00),
      ('3001', 'Accounts Payable', 'Liability', 32000.00),
      ('7001', 'GST Payable', 'Liability', 18000.00),
      ('1100', 'Bank Account', 'Asset', 175000.00),
      ('4000', 'Sales Revenue', 'Revenue', 120000.00),
      ('5100', 'Operating Expense', 'Expense', 90000.00)
    ) AS s(code, name, account_type, balance)
   WHERE NOT EXISTS (SELECT 1 FROM accounting_chart_of_accounts LIMIT 1);`,
  `INSERT INTO accounting_ledger_entries (id, entry_date, voucher_code, account_code, debit, credit, narration)
    SELECT md5(random()::text || clock_timestamp()::text)::uuid, s.entry_date::date, s.voucher_code, s.account_code, s.debit::numeric, s.credit::numeric, s.narration
    FROM (
      VALUES
      ('2025-05-01', 'JV-001', '1100', 100000.00, 0.00, 'Capital introduced'),
      ('2025-05-01', 'JV-001', '3001', 0.00, 100000.00, 'Capital introduced'),
      ('2025-05-09', 'JV-002', '1001', 75000.00, 0.00, 'Cash sale collection'),
      ('2025-05-09', 'JV-002', '4000', 0.00, 75000.00, 'Cash sale collection')
    ) AS s(entry_date, voucher_code, account_code, debit, credit, narration)
    WHERE NOT EXISTS (SELECT 1 FROM accounting_ledger_entries LIMIT 1);`,
  `INSERT INTO accounting_reconciliation_items (id, invoice_number, tax_period, status, book_tax, gst_portal_tax)
    SELECT md5(random()::text || clock_timestamp()::text)::uuid, s.invoice_number, s.tax_period, s.status, s.book_tax::numeric, s.gst_portal_tax::numeric
    FROM (
      VALUES
      ('INV-1024', 'apr-2025', 'matched', 3240.00, 3240.00),
      ('INV-1025', 'apr-2025', 'mismatched', 1800.00, 1620.00)
    ) AS s(invoice_number, tax_period, status, book_tax, gst_portal_tax)
    WHERE NOT EXISTS (SELECT 1 FROM accounting_reconciliation_items LIMIT 1);`,
  `INSERT INTO accounting_counterparties (id, entity_type, name, gstin, outstanding)
    SELECT md5(random()::text || clock_timestamp()::text)::uuid, s.entity_type, s.name, s.gstin, s.outstanding::numeric
    FROM (
      VALUES
      ('client', 'ABC Enterprises', '27AAPFU0939F1ZV', 45000.00),
      ('client', 'DEF Limited', '29AAACD1234K1Z9', 18500.00),
      ('vendor', 'XYZ Suppliers', '27AABCU9603R1ZX', 23600.00)
    ) AS s(entity_type, name, gstin, outstanding)
    WHERE NOT EXISTS (SELECT 1 FROM accounting_counterparties LIMIT 1);`,
]

export async function ensureAccountingCoreReady() {
  if (ready) return
  for (const statement of bootstrapStatements) {
    await queryMany(statement)
  }
  for (const statement of seedStatements) {
    await queryMany(statement)
  }
  ready = true
}

export async function getAccountingAsOfDate() {
  await ensureAccountingCoreReady()
  const row = await queryOne<{ asOf: string }>(`SELECT TO_CHAR(NOW()::date, 'Mon DD, YYYY') AS "asOf"`)
  return row?.asOf ?? null
}
