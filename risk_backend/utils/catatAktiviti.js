// backend/utils/catatAktiviti.js

import pool from "../config/db.js"; 

/**
 * Mencatat aktiviti pengguna ke dalam pangkalan data log_aktiviti.
 * @param {string} pengguna_id - ID pengguna yang menjalankan aktiviti.
 * @param {string} aktiviti - Ringkasan tindakan (cth: 'Tambah Risiko', 'Lulus Pindaan').
 * @param {string} ringkasan - Teks pendek untuk paparan jadual.
 * @param {string} perincian - Perincian penuh tindakan untuk modal.
 */
const catatAktiviti = async (pengguna_id, aktiviti, ringkasan, perincian) => {
    // ⭐️ DIUBAH: Tambah 'ringkasan' dan $4
    const sql = `
        INSERT INTO log_aktiviti (pengguna_id, aktiviti, ringkasan, perincian, tarikh_masa)
        VALUES ($1, $2, $3, $4, NOW())
    `;
    // ⭐️ DIUBAH: Tambah 'ringkasan'
    const values = [pengguna_id, aktiviti, ringkasan, perincian];

    try {
        await pool.query(sql, values);
        // console.log(`Aktiviti dicatat: ${aktiviti} oleh ID ${pengguna_id}`);
    } catch (error) {
        // Penting: Kegagalan log tidak sepatutnya mengganggu operasi utama.
        console.error('❌ Ralat semasa mencatat aktiviti:', error);
    }
};

export { catatAktiviti };