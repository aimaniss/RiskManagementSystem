-- Migration: Create pelan_tindakan_rawatan (Treatment Action Plans) table
-- Created: 2026-07-20

CREATE TABLE IF NOT EXISTS pelan_tindakan_rawatan (
    pelan_id SERIAL PRIMARY KEY,
    pelan_tindakan TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rawatan_id INTEGER NOT NULL REFERENCES rawatan_risiko(rawatan_id) ON DELETE CASCADE
);
