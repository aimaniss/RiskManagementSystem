-- Migration: Create kakitanganpemantauan (Monitoring Personnel) table
-- Created: 2026-07-20

CREATE TABLE IF NOT EXISTS kakitanganpemantauan (
    kakitangan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id UUID NOT NULL REFERENCES logpemantauan(log_id) ON DELETE CASCADE,
    butiran_kakitangan VARCHAR(255) NOT NULL
);
