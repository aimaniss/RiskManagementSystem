// Komponen dikongsi antara tab Tetapan Sistem
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Power, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function LencanaStatus({ aktif }) {
  return aktif ? (
    <Badge variant="success">Aktif</Badge>
  ) : (
    <Badge variant="destructive">Tidak Aktif</Badge>
  );
}

export function ButangTindakan({ aktif, onSunting, onTukarStatus }) {
  return (
    <div className="inline-flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-primary hover:text-primary"
        onClick={onSunting}
        title="Sunting"
      >
        <Pencil size={16} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${aktif ? "text-destructive hover:text-destructive" : "text-green-600 hover:text-green-600"}`}
        onClick={onTukarStatus}
        title={aktif ? "Nyahaktif" : "Aktifkan"}
      >
        <Power size={16} />
      </Button>
    </div>
  );
}

export function BarAtas({ carian, setCarian, placeholder, labelTambah, onTambah, keterangan }) {
  return (
    <div className="mb-4 grid gap-3">
      {keterangan && <p className="text-sm text-muted-foreground">{keterangan}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full sm:w-72">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder={placeholder}
            value={carian}
            onChange={(e) => setCarian(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={onTambah}>
          <Plus size={16} /> {labelTambah}
        </Button>
      </div>
    </div>
  );
}

export function RalatBorang({ mesej }) {
  if (!mesej) return null;
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {mesej}
    </div>
  );
}
