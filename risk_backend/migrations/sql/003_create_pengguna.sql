-- Migration: Create pengguna (Users) table
-- Created: 2026-07-20

CREATE TABLE IF NOT EXISTS pengguna (
    pengguna_id SERIAL PRIMARY KEY,
    staff_id VARCHAR(50) NOT NULL UNIQUE,
    nama_penuh VARCHAR(255) NOT NULL,
    katalaluan TEXT NOT NULL,
    syarikat_id INTEGER REFERENCES syarikat(syarikat_id),
    peranan_id INTEGER NOT NULL REFERENCES peranan(peranan_id),
    tarikh_dibuat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tarikh_dikemaskini TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    gambar_profil BYTEA
);
