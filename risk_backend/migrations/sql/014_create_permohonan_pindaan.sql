-- Migration: Create permohonan_pindaan (Amendment Requests) table
-- Created: 2026-07-20

CREATE TABLE IF NOT EXISTS permohonan_pindaan (
    pindaan_id SERIAL PRIMARY KEY,
    risiko_id INTEGER NOT NULL REFERENCES risiko(risiko_id) ON DELETE CASCADE,
    pengguna_id_pemohon INTEGER NOT NULL REFERENCES pengguna(pengguna_id),
    status_permohonan VARCHAR(50) NOT NULL,
    data_sebelum JSONB NOT NULL,
    data_selepas JSONB NOT NULL,
    justifikasi_penilaian TEXT,
    justifikasi_keberkesanan TEXT,
    pengguna_id_pelulus INTEGER REFERENCES pengguna(pengguna_id),
    tarikh_diproses TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sebab_ditolak VARCHAR(255)
);

-- Migration: Create kebenaran (Permissions) table
-- Created: 2026-07-20

CREATE TABLE IF NOT EXISTS kebenaran (
    kebenaran_id SERIAL PRIMARY KEY,
    nama_kebenaran VARCHAR(100) NOT NULL,
    keterangan TEXT
);

-- Migration: Create peranan_kebenaran (Role-Permission mapping) table
-- Created: 2026-07-20

CREATE TABLE IF NOT EXISTS peranan_kebenaran (
    peranan_id INTEGER REFERENCES peranan(peranan_id) ON DELETE CASCADE,
    kebenaran_id INTEGER REFERENCES kebenaran(kebenaran_id) ON DELETE CASCADE
);

-- Migration: Create notifikasi (Notifications) table
-- Created: 2026-07-20

CREATE TABLE IF NOT EXISTS notifikasi (
    notifikasi_id SERIAL PRIMARY KEY,
    pengguna_id INTEGER NOT NULL REFERENCES pengguna(pengguna_id),
    tajuk VARCHAR(255) NOT NULL,
    mesej TEXT NOT NULL,
    jenis_notifikasi VARCHAR(100) NOT NULL,
    entiti_id INTEGER,
    telah_dibaca BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
