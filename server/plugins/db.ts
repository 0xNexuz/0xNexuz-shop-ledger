import { runMigrations } from "@agent-native/core/db";

// Additive only: append new named entries, never edit an applied one.
export default runMigrations(
  [
    {
      version: 1,
      name: "shop-ledger-core",
      sql: `CREATE TABLE IF NOT EXISTS shops (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  timezone TEXT NOT NULL DEFAULT 'Africa/Lagos',
  created_at TEXT NOT NULL DEFAULT (now()),
  owner_email TEXT NOT NULL DEFAULT 'local@localhost',
  org_id TEXT,
  visibility TEXT NOT NULL DEFAULT 'private'
);
CREATE TABLE IF NOT EXISTS shop_shares (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  principal_type TEXT NOT NULL,
  principal_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (now()),
  notified_at TEXT
);
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES shops(id),
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'piece',
  price_kobo BIGINT NOT NULL DEFAULT 0 CHECK (price_kobo >= 0),
  cost_kobo BIGINT CHECK (cost_kobo IS NULL OR cost_kobo >= 0),
  stock_qty INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  low_stock_at INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_at >= 0),
  archived BOOLEAN NOT NULL DEFAULT false,
  owner_email TEXT NOT NULL,
  org_id TEXT,
  created_at TEXT NOT NULL DEFAULT (now()),
  updated_at TEXT NOT NULL DEFAULT (now())
);
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES shops(id),
  name TEXT NOT NULL,
  phone TEXT,
  note TEXT,
  balance_kobo BIGINT NOT NULL DEFAULT 0 CHECK (balance_kobo >= 0),
  last_activity_at TEXT,
  owner_email TEXT NOT NULL,
  org_id TEXT,
  created_at TEXT NOT NULL DEFAULT (now())
);
CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES shops(id),
  kind TEXT NOT NULL CHECK (kind IN ('sale', 'payment', 'restock', 'adjustment')),
  status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('posted', 'voided')),
  customer_id TEXT REFERENCES customers(id),
  total_kobo BIGINT NOT NULL DEFAULT 0 CHECK (total_kobo >= 0),
  paid_kobo BIGINT NOT NULL DEFAULT 0 CHECK (paid_kobo >= 0),
  balance_delta_kobo BIGINT NOT NULL DEFAULT 0,
  method TEXT CHECK (method IS NULL OR method IN ('cash', 'transfer', 'pos')),
  due_date TEXT,
  note TEXT,
  source TEXT NOT NULL DEFAULT 'ui',
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (now()),
  voided_at TEXT,
  void_reason TEXT,
  owner_email TEXT NOT NULL,
  org_id TEXT,
  CHECK (paid_kobo <= total_kobo OR kind = 'payment')
);
CREATE TABLE IF NOT EXISTS entry_lines (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES entries(id),
  shop_id TEXT NOT NULL REFERENCES shops(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  qty_delta INTEGER NOT NULL CHECK (qty_delta <> 0),
  unit_kobo BIGINT NOT NULL DEFAULT 0,
  line_total_kobo BIGINT NOT NULL DEFAULT 0,
  owner_email TEXT NOT NULL,
  org_id TEXT
);
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES shops(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  message TEXT NOT NULL,
  amount_kobo BIGINT NOT NULL CHECK (amount_kobo >= 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'sent', 'dismissed')),
  drafted_by TEXT NOT NULL DEFAULT 'ui',
  approved_at TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (now()),
  updated_at TEXT NOT NULL DEFAULT (now()),
  owner_email TEXT NOT NULL,
  org_id TEXT
);
CREATE INDEX IF NOT EXISTS shops_owner_org_idx ON shops (owner_email, org_id, created_at);
CREATE INDEX IF NOT EXISTS shop_shares_resource_idx ON shop_shares (resource_id, principal_type, principal_id);
CREATE UNIQUE INDEX IF NOT EXISTS products_shop_name_uq ON products (shop_id, lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS customers_shop_name_uq ON customers (shop_id, lower(name));
CREATE INDEX IF NOT EXISTS customers_shop_balance_idx ON customers (shop_id, balance_kobo);
CREATE INDEX IF NOT EXISTS entries_shop_occurred_idx ON entries (shop_id, occurred_at);
CREATE INDEX IF NOT EXISTS entries_customer_occurred_idx ON entries (customer_id, occurred_at);
CREATE INDEX IF NOT EXISTS entry_lines_entry_idx ON entry_lines (entry_id);
CREATE INDEX IF NOT EXISTS entry_lines_product_idx ON entry_lines (product_id);
CREATE INDEX IF NOT EXISTS reminders_shop_status_idx ON reminders (shop_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS reminders_one_open_per_customer_uq ON reminders (customer_id) WHERE status IN ('draft', 'approved')`,
    },
  ],
  { table: "shop_ledger_migrations" },
);
