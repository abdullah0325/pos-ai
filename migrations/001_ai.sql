CREATE TABLE IF NOT EXISTS products (id text PRIMARY KEY, name text NOT NULL, unit text, stock numeric NOT NULL DEFAULT 0, purchase_price numeric, sale_price numeric, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS raw_materials (LIKE products INCLUDING ALL);
CREATE TABLE IF NOT EXISTS purchases (id text PRIMARY KEY, supplier_name text, bill_date text, total numeric, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS purchase_items (id text PRIMARY KEY, purchase_id text NOT NULL REFERENCES purchases(id), item_id text, kind text, raw_name text NOT NULL, qty numeric NOT NULL, unit text, rate numeric, amount numeric);
CREATE TABLE IF NOT EXISTS sales (id text PRIMARY KEY, customer_name text, sale_date text, total numeric NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS sale_items (id text PRIMARY KEY, sale_id text NOT NULL REFERENCES sales(id), item_id text, kind text, raw_name text NOT NULL, qty numeric NOT NULL, unit text, rate numeric, amount numeric);
CREATE TABLE IF NOT EXISTS expenses (id text PRIMARY KEY, description text, expense_date text, amount numeric);
CREATE TABLE IF NOT EXISTS stock_movements (id text PRIMARY KEY, item_id text NOT NULL, kind text NOT NULL CHECK (kind IN ('product','raw_material')), type text NOT NULL CHECK (type IN ('purchase','sale','adjust')), qty numeric NOT NULL, ref_id text NOT NULL, created_at timestamptz NOT NULL);
