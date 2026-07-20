-- Migration: Create punca_risiko (Risk Causes) table
-- Created: 2026-07-20

CREATE TABLE IF NOT EXISTS punca_risiko (
    id SERIAL PRIMARY KEY,
    risiko_id INTEGER NOT NULL REFERENCES risiko(risiko_id) ON DELETE CASCADE,
    punca TEXT NOT NULL
);
