import { useCallback, useState } from "react";
import { Navigate } from "react-router-dom";
import { Building2, Network, Tags } from "lucide-react";
import PageHeader from "@/components/ui/page-header";
import Toast from "@/components/ui/toast";
import { hasKebenaran } from "@/utils/auth";
import { cn } from "@/lib/utils";
import TabSyarikat from "./TabSyarikat";
import TabBahagian from "./TabBahagian";
import TabRujukan from "./TabRujukan";

const TAB = [
  { id: "syarikat", label: "Syarikat", icon: Building2 },
  { id: "bahagian", label: "Bahagian / Unit", icon: Network },
  { id: "kategori", label: "Kategori Risiko", icon: Tags },
];

export default function TetapanSistem() {
  const [tab, setTab] = useState("syarikat");
  const [toast, setToast] = useState(null);
  // Stabil supaya tab tidak memuat semula data setiap kali toast berubah
  const beritahu = useCallback(
    (variant, title, message) => setToast({ variant, title, message }),
    []
  );

  if (!hasKebenaran("tetapan:urus")) return <Navigate to="/unauthorized" replace />;

  return (
    <div>
      <PageHeader
        title="Tetapan Sistem"
        description="Urus data rujukan sistem tanpa perlu mengubah pangkalan data secara terus"
      />

      <div className="mb-4 flex gap-1 overflow-x-auto border-b" role="tablist">
        {TAB.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "syarikat" && <TabSyarikat beritahu={beritahu} />}
      {tab === "bahagian" && <TabBahagian beritahu={beritahu} />}
      {tab === "kategori" && (
        <TabRujukan
          jenis="kategori_risiko"
          label="Kategori Risiko"
          keterangan="Pilihan kategori semasa mendaftar dan menyunting risiko, dan juga dipaparkan dalam Panduan. Tukar nama akan mengemas kini semua risiko yang menggunakan kategori tersebut."
          beritahu={beritahu}
        />
      )}

      {toast && (
        <div className="fixed right-4 top-[64px] z-50 w-[340px]">
          <Toast
            variant={toast.variant}
            title={toast.title}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        </div>
      )}
    </div>
  );
}
