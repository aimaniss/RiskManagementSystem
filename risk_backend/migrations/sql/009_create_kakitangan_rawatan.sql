-- Migration: Create kakitangan_rawatan (Treatment Personnel) table
-- Created: 2026-07-20

CREATE TABLE IF NOT EXISTS kakitangan_rawatan (
    kakitangan_id SERIAL PRIMARY KEY,
    nama_kakitangan VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rawatan_id INTEGER NOT NULL REFERENCES rawatan_risiko(rawatan_id) ON DELETE CASCADE
);
