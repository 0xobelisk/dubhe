-- Transactions table
CREATE TABLE IF NOT EXISTS "__dubheStoreTransactions" (
    id SERIAL PRIMARY KEY, 
    sender TEXT NOT NULL, 
    checkpoint INTEGER NOT NULL, 
    digest TEXT NOT NULL, 
    package TEXT NOT NULL,
    module TEXT NOT NULL,
    function TEXT NOT NULL,
    arguments TEXT NOT NULL,
    cursor TEXT NOT NULL, 
    created_at TEXT NOT NULL
);

-- Schema table
CREATE TABLE IF NOT EXISTS "__dubheStoreSchemas" (
    id SERIAL PRIMARY KEY,
    last_update_checkpoint TEXT NOT NULL,
    last_update_digest TEXT NOT NULL,
    name TEXT NOT NULL,
    key1 TEXT,
    key2 TEXT,
    value TEXT NOT NULL,
    is_removed BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Events table
CREATE TABLE IF NOT EXISTS "__dubheStoreEvents" (
    id SERIAL PRIMARY KEY,
    sender TEXT NOT NULL,
    checkpoint TEXT NOT NULL,
    digest TEXT NOT NULL,
    name TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- Add indexes to improve query performance
CREATE INDEX IF NOT EXISTS idx_transactions_digest ON "__dubheStoreTransactions" (digest);
CREATE INDEX IF NOT EXISTS idx_transactions_sender ON "__dubheStoreTransactions" (sender);
CREATE INDEX IF NOT EXISTS idx_schemas_name ON "__dubheStoreSchemas" (name);
CREATE INDEX IF NOT EXISTS idx_schemas_is_removed ON "__dubheStoreSchemas" (is_removed);
CREATE INDEX IF NOT EXISTS idx_events_name ON "__dubheStoreEvents" (name);
CREATE INDEX IF NOT EXISTS idx_events_digest ON "__dubheStoreEvents" (digest);
CREATE INDEX IF NOT EXISTS idx_events_sender ON "__dubheStoreEvents" (sender);

CREATE UNIQUE INDEX IF NOT EXISTS idx_schemas_unique_key ON "__dubheStoreSchemas" (name, key1, key2);

-- Configuration table, used to store global configurations and metadata
CREATE TABLE IF NOT EXISTS "__dubheStoreConfig" (
    id SERIAL PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert some basic configurations
INSERT INTO "__dubheStoreConfig" (key, value)
VALUES ('version', '"1.0.0"'),
       ('last_checkpoint', '0'),
       ('chain_id', '0')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = CURRENT_TIMESTAMP;
