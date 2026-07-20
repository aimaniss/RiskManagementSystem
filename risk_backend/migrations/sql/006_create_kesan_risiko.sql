-- Migration: Create kesan_risiko (Risk Consequences) table
-- Created: 2026-07-20

CREATE TABLE IF NOT EXISTS kesan_risiko (
    id SERIAL PRIMARY KEY,
    risiko_id INTEGER NOT NULL REFERENCES risiko(risiko_id) ON DELETE CASCADE,
    kesan TEXT NOT NULL
);
