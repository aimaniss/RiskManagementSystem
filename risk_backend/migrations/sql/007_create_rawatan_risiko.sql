-- Migration: Create rawatan_risiko (Risk Treatments) table
-- Created: 2026-07-20

CREATE TABLE IF NOT EXISTS rawatan_risiko (
    rawatan_id SERIAL PRIMARY KEY,
    risiko_id INTEGER NOT NULL REFERENCES risiko(risiko_id) ON DELETE CASCADE,
    jenis_kawalan VARCHAR(100) NOT NULL,
    tempoh_siap VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
