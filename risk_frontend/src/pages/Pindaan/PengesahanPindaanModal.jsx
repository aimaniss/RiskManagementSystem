import React from 'react';
import ConfirmModal from "@/components/ui/confirm-modal";

// --- DIUBAH: Selaraskan label dengan nama lajur pangkalan data ---
// Objek untuk menterjemah nama medan (key) kepada label yang mesra pengguna
const fieldLabels = {
    skor_kebarangkalian: "Skor Kebarangkalian (Penilaian)",
    skor_impak: "Skor Impak (Penilaian)",
    skor_kebarangkalian_selepas: "Skor Kebarangkalian (Keberkesanan)",
    skor_impak_selepas: "Skor Impak (Keberkesanan)",
};
// --- TAMAT PERUBAHAN ---

function PengesahanPindaanModal({ isOpen, onClose, onConfirm, perubahan, isSubmitting }) {
    if (!isOpen) return null;

    // Dapatkan data sebelum & selepas, atau objek kosong jika 'perubahan' belum wujud
    const { data_sebelum = {}, data_selepas = {} } = perubahan || {};

    // Dapatkan senarai unik semua medan yang berubah
    const changedKeys = Object.keys(data_selepas);

    // Bina deskripsi perubahan untuk ConfirmModal
    const changeDescription = changedKeys.length === 0
        ? "Tiada perubahan dikesan."
        : changedKeys.map(key => `${fieldLabels[key] || key}: ${data_sebelum[key] || '-'} → ${data_selepas[key] || '-'}`).join("\n");

    return (
        <ConfirmModal
            open={isOpen}
            onOpenChange={(open) => { if (!open) onClose(); }}
            title="Sahkan Perubahan"
            description={`Sila sahkan perubahan yang dicadangkan sebelum menghantar:\n\n${changeDescription}`}
            confirmText={isSubmitting ? "Menghantar..." : "Sahkan & Hantar"}
            cancelText="Batal"
            variant="default"
            icon="send"
            onConfirm={onConfirm}
            onCancel={onClose}
        />
    );
}

export default PengesahanPindaanModal;
