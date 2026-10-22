CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE SCHEMA IF NOT EXISTS hardware;
SET search_path TO hardware, public;
CREATE TABLE IF NOT EXISTS app_state (id integer PRIMARY KEY CHECK(id=1), revision integer NOT NULL DEFAULT 0, data jsonb NOT NULL, requests jsonb NOT NULL DEFAULT '{}');
CREATE TABLE IF NOT EXISTS products (
 id text PRIMARY KEY, data jsonb NOT NULL,
 name text GENERATED ALWAYS AS (data->>'name') STORED,
 group_name text GENERATED ALWAYS AS (data->>'groupName') STORED,
 spec text GENERATED ALWAYS AS (data->>'spec') STORED,
 category text GENERATED ALWAYS AS (data->>'category') STORED,
 base_unit text GENERATED ALWAYS AS (COALESCE(data->>'baseUnit',data->>'unit')) STORED,
 units jsonb GENERATED ALWAYS AS (data->'units') STORED,
 purchase_price numeric GENERATED ALWAYS AS ((data->>'costPrice')::numeric) STORED,
 sale_price numeric GENERATED ALWAYS AS ((data->>'retailPrice')::numeric) STORED,
 stock numeric GENERATED ALWAYS AS ((data->>'quantity')::numeric) STORED,
 reorder_level numeric GENERATED ALWAYS AS ((data->>'reorderLevel')::numeric) STORED
);
CREATE INDEX IF NOT EXISTS products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE TABLE IF NOT EXISTS product_aliases(alias_key text PRIMARY KEY, product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE, source text NOT NULL);
CREATE TABLE IF NOT EXISTS suppliers(id text PRIMARY KEY, data jsonb NOT NULL, name text GENERATED ALWAYS AS (data->>'name') STORED, balance numeric GENERATED ALWAYS AS ((data->>'currentBalance')::numeric) STORED);
CREATE TABLE IF NOT EXISTS customers(LIKE suppliers INCLUDING ALL);
CREATE TABLE IF NOT EXISTS purchases(id text PRIMARY KEY, data jsonb NOT NULL, total numeric GENERATED ALWAYS AS ((data->>'grandTotal')::numeric) STORED);
CREATE TABLE IF NOT EXISTS sales(LIKE purchases INCLUDING ALL);
CREATE TABLE IF NOT EXISTS purchase_items(id text PRIMARY KEY, purchase_id text REFERENCES purchases(id) ON DELETE CASCADE, product_id text, data jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS sale_items(id text PRIMARY KEY, sale_id text REFERENCES sales(id) ON DELETE CASCADE, product_id text, data jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS expenses(id text PRIMARY KEY, data jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS stock_movements(id text PRIMARY KEY, product_id text NOT NULL, type text NOT NULL CHECK(type IN ('purchase','sale','adjust','opening')), qty_base numeric NOT NULL, ref_id text NOT NULL, created_at timestamptz NOT NULL, data jsonb NOT NULL);
CREATE INDEX IF NOT EXISTS movements_product ON stock_movements(product_id);
