-- Migration: Create bahagian (Division/Unit reference) table
-- Created: 2026-08-24

CREATE TABLE IF NOT EXISTS bahagian (
    bahagian_id SERIAL PRIMARY KEY,
    nama_bahagian VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Seed data asas
INSERT INTO bahagian (nama_bahagian) VALUES
    ('Pentadbiran'),
    ('Kewangan'),
    ('Operasi'),
    ('Sumber Manusia'),
    ('Pemasaran'),
    ('Teknologi Maklumat')
ON CONFLICT (nama_bahagian) DO NOTHING;
