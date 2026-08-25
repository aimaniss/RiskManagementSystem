import React from "react";
import ConfirmModal from "./confirm-modal";
import { AlertTriangle } from "lucide-react";

export default function UnsavedChangesModal({ open, onOpenChange, onDiscard, onSaveDraft }) {
  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      icon="warning"
      variant="warning"
      title="Perubahan belum disimpan"
      description="Anda akan kehilangan maklumat yang telah diisi jika keluar sekarang."
      confirmText="Buang perubahan"
      cancelText="Simpan sebagai draf"
      onConfirm={onDiscard}
      onCancel={() => {
        onSaveDraft?.();
        onOpenChange?.(false);
      }}
    />
  );
}
