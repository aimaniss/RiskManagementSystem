-- Migration: Create log_aktiviti (Activity/Audit Log) table
-- Created: 2026-07-20

CREATE TABLE IF NOT EXISTS log_aktiviti (
    id BIGSERIAL PRIMARY KEY,
    pengguna_id INTEGER NOT NULL REFERENCES pengguna(pengguna_id),
    aktiviti VARCHAR(100) NOT NULL,
    perincian TEXT NOT NULL,
    tarikh_masa TIMESTAMP NOT NULL DEFAULT NOW(),
    ringkasan VARCHAR(255) NOT NULL
);
