import { FilePenLine } from "lucide-react";
import EmptyState from "@/components/ui/empty-state";
import LoadingSpinner from "@/components/ui/loading-spinner";
import KadPindaan from "@/components/risiko/KadPindaan";

/** Sejarah semua permohonan pindaan bagi satu risiko, terkini dahulu. */
export default function TabPindaan({ senarai }) {
  if (senarai === null) return <LoadingSpinner text="Memuatkan sejarah pindaan..." />;
  if (senarai.length === 0) {
    return (
      <EmptyState
        icon={FilePenLine}
        title="Tiada pindaan"
        description="Risiko ini belum pernah dipinda."
      />
    );
  }
  return (
    <ol className="grid gap-4" aria-label="Sejarah pindaan">
      {senarai.map((p) => (
        <li key={p.pindaan_id}>
          <KadPindaan p={p} />
        </li>
      ))}
    </ol>
  );
}
