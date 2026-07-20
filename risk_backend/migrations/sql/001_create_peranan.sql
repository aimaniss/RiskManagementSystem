-- Migration: Create peranan (Roles) table
-- Created: 2026-07-20

CREATE TABLE IF NOT EXISTS peranan (
    peranan_id SERIAL PRIMARY KEY,
    nama_peranan VARCHAR(100) NOT NULL UNIQUE,
    keterangan TEXT
);

INSERT INTO peranan (nama_peranan, keterangan) VALUES
    ('Admin', 'Pentadbir sistem'),
    ('Executive', 'Eksekutif'),
    ('Staff', 'Kakitangan'),
    ('Ketua Subsidiari', 'Ketua Subsidiari')
ON CONFLICT (nama_peranan) DO NOTHING;
