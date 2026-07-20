-- Migration: Create pelantindakanpemantauan (Monitoring Action Plans) table
-- Created: 2026-07-20

CREATE TABLE IF NOT EXISTS pelantindakanpemantauan (
    pelan_tindakan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id UUID NOT NULL REFERENCES logpemantauan(log_id) ON DELETE CASCADE,
    butiran_aktiviti TEXT NOT NULL
);
