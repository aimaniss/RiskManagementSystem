-- Migration: Create logpemantauan (Monitoring Logs) table
-- Created: 2026-07-20

CREATE TABLE IF NOT EXISTS logpemantauan (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    risiko_id INTEGER NOT NULL REFERENCES risiko(risiko_id) ON DELETE CASCADE,
    tarikh_pemantauan DATE NOT NULL,
    tahun_pemantauan INTEGER NOT NULL,
    separuh_tahun_pemantauan INTEGER,
    skor_kebarangkalian_selepas INTEGER,
    skor_impak_selepas INTEGER,
    kekerapan_pemantauan VARCHAR(100),
    keberkesanan VARCHAR(100),
    status_pemantauan VARCHAR(50) NOT NULL,
    catatan TEXT,
    no_bil_kelulusan VARCHAR(100),
    tarikh_kemaskini TIMESTAMP,
    skor_risiko_pemantauan VARCHAR(10),
    justifikasi_pindaan_pemantauan TEXT,
    created_at_pemantauan TIMESTAMPTZ,
    update_at_pemantauan TIMESTAMPTZ,
    created_by_pemantauan INTEGER,
    updated_by_pemantauan INTEGER,
    dipinda_oleh_id INTEGER
);
