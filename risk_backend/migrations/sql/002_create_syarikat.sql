-- Migration: Create syarikat (Company/Subsidiary) table
-- Created: 2026-07-20

CREATE TABLE IF NOT EXISTS syarikat (
    syarikat_id SERIAL PRIMARY KEY,
    nama_syarikat VARCHAR(255) NOT NULL,
    light_logo_url VARCHAR(255),
    kod_warna VARCHAR(50),
    singkatan VARCHAR(100),
    dark_logo_url VARCHAR(255)
);
