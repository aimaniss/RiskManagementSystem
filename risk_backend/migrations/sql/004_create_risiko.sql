-- Migration: Create risiko (Risks) table
-- Created: 2026-07-20

CREATE TABLE IF NOT EXISTS risiko (
    risiko_id SERIAL PRIMARY KEY,
    no_rujukan VARCHAR(100) NOT NULL,
    tahun INTEGER NOT NULL,
    separuh_tahun INTEGER NOT NULL,
    syarikat_id INTEGER NOT NULL,
    kategori VARCHAR(100) NOT NULL,
    bahagian TEXT NOT NULL,
    risiko TEXT NOT NULL,
    skor_kebarangkalian INTEGER,
    skor_impak INTEGER,
    skor_risiko VARCHAR(10),
    status_risiko VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER,
    justifikasi_pindaan_penilaian TEXT,
    dipinda_oleh_id INTEGER
);
