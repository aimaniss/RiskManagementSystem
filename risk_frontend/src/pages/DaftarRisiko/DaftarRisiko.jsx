import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Trash2,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  Info,
  ListTree,
  ClipboardPenLine,
  CalendarRange,
} from "lucide-react";
import api from "../../api/api";
import Toast from "@/components/ui/toast";
import PageHeader from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { getAuthUser } from "../../utils/auth";
import { useSyarikats } from "../../hooks/useSyarikats";
import { useBahagians } from "../../hooks/useBahagians";
import { usePanduan } from "../../hooks/usePanduan";
import { useSenaraiRujukan, pilihanDenganNilaiSemasa } from "@/hooks/useSenaraiRujukan";

function DaftarRisiko() {
  const navigate = useNavigate();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentHalf = currentMonth <= 6 ? "1" : "2";

  const [formData, setFormData] = useState({
    tahun: String(currentYear),
    separuhTahun: currentHalf,
    syarikat: "",
    kategori: "",
    bahagian: "",
    risiko: "",
  });

  const [puncaList, setPuncaList] = useState([""]);
  const [kesanList, setKesanList] = useState([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const debounceRef = useRef(null);
  const { syarikatList } = useSyarikats();
  const { bahagianList, refetch: refetchBahagian } = useBahagians();
  const { senarai: senaraiKategori } = useSenaraiRujukan("kategori_risiko");
  const { openPanduan, PanduanRenderer } = usePanduan();
  const [showTambahBahagian, setShowTambahBahagian] = useState(false);
  const [namaBahagianBaru, setNamaBahagianBaru] = useState("");
  const [isAddingBahagian, setIsAddingBahagian] = useState(false);

  const handleTambahBahagian = async () => {
    if (!namaBahagianBaru.trim()) return;
    setIsAddingBahagian(true);
    try {
      const res = await api.post("/bahagian", { nama_bahagian: namaBahagianBaru.trim() });
      await refetchBahagian();
      setFormData(prev => ({ ...prev, bahagian: res.data.nama_bahagian }));
      setToast({ variant: "success", title: "Berjaya", message: `Bahagian "${res.data.nama_bahagian}" telah ditambah.` });
      setShowTambahBahagian(false);
      setNamaBahagianBaru("");
    } catch (err) {
      const msg = err.response?.status === 409
        ? "Bahagian ini sudah wujud dalam senarai."
        : err.response?.data?.error || "Gagal menambah bahagian baharu.";
      setToast({ variant: "error", title: "Ralat", message: msg });
    } finally {
      setIsAddingBahagian(false);
    }
  };

  const authUser = getAuthUser();
  const userRole = authUser?.role || "";
  const syarikatId = authUser?.syarikatId || "";

  useEffect(() => {
    if (syarikatList.length > 0 && ["STAFF", "KETUA SUBSIDIARI"].includes(userRole)) {
      setFormData(prev => ({ ...prev, syarikat: syarikatId }));
    }
  }, [syarikatList, userRole, syarikatId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!formData.risiko || formData.risiko.trim().length < 5) {
      setDuplicates([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setCheckingDuplicate(true);
      try {
        const finalSyarikat = formData.syarikat
          ? parseInt(formData.syarikat)
          : ["STAFF", "KETUA SUBSIDIARI"].includes(userRole)
            ? parseInt(syarikatId)
            : null;
        const params = new URLSearchParams({ risiko: formData.risiko.trim() });
        if (finalSyarikat) params.append("syarikat_id", finalSyarikat);
        const res = await api.get(`/risiko/check-duplicate?${params.toString()}`);
        setDuplicates(res.data.duplicates || []);
      } catch {
        setDuplicates([]);
      } finally {
        setCheckingDuplicate(false);
      }
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [formData.risiko, formData.syarikat, userRole, syarikatId]);

  const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const addPunca = () => setPuncaList([...puncaList, ""]);
  const addKesan = () => setKesanList([...kesanList, ""]);
  const updatePunca = (i, val) => { const tmp = [...puncaList]; tmp[i] = val; setPuncaList(tmp); };
  const updateKesan = (i, val) => { const tmp = [...kesanList]; tmp[i] = val; setKesanList(tmp); };
  const removePunca = i => { const tmp = [...puncaList]; tmp.splice(i, 1); setPuncaList(tmp); };
  const removeKesan = i => { const tmp = [...kesanList]; tmp.splice(i, 1); setKesanList(tmp); };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!formData.tahun || !formData.separuhTahun || !formData.syarikat) {
      return setToast({ variant: "warning", title: "Amaran", message: "Sila lengkapkan semua maklumat dalam Maklumat Risiko." });
    }
    if (!formData.kategori || !formData.bahagian || !formData.risiko || puncaList.every(p => p.trim() === "") || kesanList.every(k => k.trim() === "")) {
      return setToast({ variant: "warning", title: "Amaran", message: "Sila lengkapkan semua maklumat dalam Pengenalpastian Risiko." });
    }
    if (duplicates.some(d => d.same_company)) {
      return setToast({ variant: "error", title: "Tidak dibenarkan", message: "Risiko ini telah didaftarkan oleh syarikat anda. Risiko sama tidak dibenarkan dalam syarikat yang sama." });
    }

    const finalSyarikat = formData.syarikat
      ? parseInt(formData.syarikat)
      : ["STAFF", "KETUA SUBSIDIARI"].includes(userRole)
        ? parseInt(syarikatId)
        : null;
    if (!finalSyarikat) return setToast({ variant: "error", title: "Ralat", message: "Syarikat tidak sah." });

    const tahunInt = formData.tahun !== "" ? parseInt(formData.tahun) : null;
    if (!tahunInt) return setToast({ variant: "error", title: "Ralat", message: "Sila masukkan Tahun yang sah." });

    const finalData = {
      ...formData,
      tahun: tahunInt,
      separuhTahun: formData.separuhTahun !== "" ? parseInt(formData.separuhTahun) : null,
      syarikatId: finalSyarikat,
      punca: puncaList.filter(p => p.trim() !== ""),
      kesan: kesanList.filter(k => k.trim() !== ""),
    };

    setIsSubmitting(true);
    try {
      const { data } = await api.post("/risiko", finalData);
      // Buka rekod baharu supaya pendaftar nampak status kelulusan & langkah seterusnya
      navigate(`/risiko/${data.risiko_id}`, {
        state: {
          latar: { pathname: "/SenaraiRisiko", search: "" },
          mesej: `Risiko ${data.no_rujukan || ""} berjaya didaftarkan dan menunggu kelulusan.` },
      });
    } catch (err) {
      console.error("Error:", err.response?.data || err.message);
      setToast({
        variant: "error",
        title: "Ralat",
        message: err.response?.data?.error || "Gagal mendaftar risiko.",
      });
    } finally { setIsSubmitting(false); }
  };

  const renderDynamicList = (list, updateFn, removeFn, addFn, label, contoh) => (
    <div className="space-y-2">
      {list.map((val, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Input
            id={idx === 0 ? `medan-${label.toLowerCase()}` : undefined}
            aria-label={`${label} ${idx + 1}`}
            value={val}
            onChange={e => updateFn(idx, e.target.value)}
            placeholder={idx === 0 ? contoh : ""}
            className="h-9"
          />
          {idx !== 0 && (
            <Button type="button" variant="ghost" size="icon" aria-label={`Buang ${label.toLowerCase()} ${idx + 1}`} className="h-9 w-9 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeFn(idx)}>
              <Trash2 size={15} />
            </Button>
          )}
          {idx === list.length - 1 && (
            <Button type="button" variant="ghost" size="icon" aria-label={`Tambah ${label.toLowerCase()}`} className="h-9 w-9 shrink-0 text-primary hover:text-primary hover:bg-primary/10" onClick={addFn}>
              <Plus size={15} />
            </Button>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daftar Risiko"
        description="Daftarkan risiko baharu mengikut tahun, syarikat dan kategori."
        actions={
          <Button variant="outline" size="sm" onClick={() => openPanduan()} className="gap-1.5">
            <BookOpen size={14} />
            Panduan
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          {/* Kolum Utama */}
          <div className="xl:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-4 border-b border-border/70">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-primary">
                    <CalendarRange size={16} />
                  </span>
                  Maklumat Asas
                </CardTitle>
                <CardDescription>Sesi pendaftaran dan syarikat yang terlibat.</CardDescription>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="medan-tahun">Tahun</Label>
                    <Input id="medan-tahun" value={formData.tahun} readOnly className="bg-muted cursor-not-allowed h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="medan-separuh">Separuh Tahun</Label>
                    <Select id="medan-separuh" name="separuhTahun" value={formData.separuhTahun} onChange={handleChange} disabled className="h-9">
                      <option value="1">Pertama (Jan-Jun)</option>
                      <option value="2">Kedua (Jul-Dis)</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="medan-syarikat">Syarikat *</Label>
                    <Select
                      id="medan-syarikat"
                      name="syarikat"
                      value={formData.syarikat}
                      onChange={handleChange}
                      disabled={["STAFF", "KETUA SUBSIDIARI"].includes(userRole)}
                      className="h-9"
                    >
                      <option value="">-- Pilih --</option>
                      {syarikatList.length > 0
                        ? syarikatList.map(s => <option key={s.syarikat_id} value={s.syarikat_id}>{s.nama_syarikat}</option>)
                        : <option disabled>Tiada syarikat</option>}
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="medan-kategori">Kategori Risiko *</Label>
                    <Select id="medan-kategori" name="kategori" value={formData.kategori} onChange={handleChange} className="h-9">
                      <option value="">-- Pilih --</option>
                      {pilihanDenganNilaiSemasa(senaraiKategori, formData.kategori).map((k) => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="medan-bahagian">Bahagian / Unit *</Label>
                      <button
                        type="button"
                        onClick={() => setShowTambahBahagian(v => !v)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-dark transition-colors"
                      >
                        <Plus size={12} /> Tambah Bahagian
                      </button>
                    </div>
                    <Select id="medan-bahagian" name="bahagian" value={formData.bahagian} onChange={handleChange} className="h-9">
                      <option value="">-- Pilih --</option>
                      {bahagianList.length > 0
                        ? bahagianList.map(b => <option key={b.bahagian_id} value={b.nama_bahagian}>{b.nama_bahagian}</option>)
                        : <option disabled>Tiada bahagian</option>}
                    </Select>
                    {showTambahBahagian && (
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-accent/60 p-2">
                        <Input
                          autoFocus
                          value={namaBahagianBaru}
                          onChange={e => setNamaBahagianBaru(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleTambahBahagian())}
                          placeholder="Nama bahagian/unit baharu"
                          className="h-8 flex-1 bg-white text-xs"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleTambahBahagian}
                          disabled={!namaBahagianBaru.trim() || isAddingBahagian}
                          className="h-8 px-3 text-xs"
                        >
                          {isAddingBahagian ? "Menambah..." : "Simpan"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="medan-risiko">Risiko *</Label>
                  <Textarea
                    id="medan-risiko"
                    name="risiko"
                    value={formData.risiko}
                    onChange={handleChange}
                    placeholder="Huraikan risiko dengan jelas..."
                    className="min-h-[90px] resize-y"
                  />
                  {checkingDuplicate && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-0.5">
                      <Info size={12} /> Memeriksa risiko serupa...
                    </p>
                  )}
                </div>

                {duplicates.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={14} className="text-amber-600" />
                      <span className="text-xs font-semibold text-amber-800">Risiko serupa telah didaftarkan</span>
                    </div>
                    <div className="space-y-1.5">
                      {duplicates.map(d => (
                        <div key={d.risiko_id} className="flex items-center justify-between bg-white rounded-md border border-amber-200 px-2.5 py-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {d.same_company
                              ? <AlertTriangle size={12} className="text-red-500 shrink-0" />
                              : <CheckCircle size={12} className="text-amber-500 shrink-0" />}
                            <span className="text-sm font-semibold text-foreground">{d.no_rujukan}</span>
                            <span className="text-[11px] text-muted-foreground truncate">{d.nama_syarikat}</span>
                          </div>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ml-2 ${d.same_company ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                            {d.same_company ? "Tidak dibenarkan" : "Telah didaftarkan"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4 border-b border-border/70">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-primary">
                    <ListTree size={16} />
                  </span>
                  Punca & Kesan
                </CardTitle>
                <CardDescription>Senaraikan punca-punca risiko dan kesannya. Klik + untuk tambah medan baharu.</CardDescription>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="medan-punca">Punca *</Label>
                    {renderDynamicList(puncaList, updatePunca, removePunca, addPunca, "Punca", "Contoh: Perkakasan pelayan usang")}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="medan-kesan">Kesan *</Label>
                    {renderDynamicList(kesanList, updateKesan, removeKesan, addKesan, "Kesan", "Contoh: Gangguan perkhidmatan kepada pelanggan")}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-end gap-2 rounded-xl border bg-card px-5 py-3.5 shadow-sm">
              <p className="mr-auto text-xs text-muted-foreground hidden sm:block">
                Medan bertanda * wajib diisi.
              </p>
              <Button type="submit" disabled={isSubmitting} className="px-6 gap-1.5">
                <ClipboardPenLine size={15} />
                {isSubmitting ? "Menghantar..." : "Daftar Risiko"}
              </Button>
            </div>
          </div>

          {/* Panel Panduan Ringkas */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <BookOpen size={15} className="text-primary" />
                  Langkah Pendaftaran
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ol className="relative border-l border-border ml-2 space-y-5">
                  {[
                    ["Sesi & Syarikat", "Tahun dan separuh tahun ditetapkan secara automatik. Pilih syarikat berkenaan."],
                    ["Huraikan Risiko", "Nyatakan risiko dengan jelas beserta kategori dan bahagian/unit."],
                    ["Punca & Kesan", "Senaraikan sekurang-kurangnya satu punca dan satu kesan."],
                    ["Semak & Hantar", "Sistem akan menyemak risiko serupa secara automatik sebelum penyerahan."],
                  ].map(([t, d], i) => (
                    <li key={i} className="ml-5">
                      <span className="absolute -left-[11px] flex h-[22px] w-[22px] items-center justify-center rounded-full bg-accent text-[11px] font-bold text-primary ring-4 ring-background">
                        {i + 1}
                      </span>
                      <p className="text-[13px] font-semibold text-foreground">{t}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{d}</p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <Card className="bg-accent/60 border-primary/20">
              <CardContent className="pt-5">
                <div className="flex items-start gap-2.5">
                  <Info size={16} className="text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">Risiko pendua tidak dibenarkan</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Risiko yang sama dalam syarikat yang sama tidak boleh didaftarkan semula.
                      Risiko serupa dari syarikat lain akan dipaparkan sebagai rujukan.
                    </p>
                    <button
                      type="button"
                      onClick={() => openPanduan()}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Baca panduan penuh
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      {PanduanRenderer}

      {toast && (
        <div className="fixed top-[72px] right-4 z-[60] max-w-sm">
          <Toast variant={toast.variant} title={toast.title} message={toast.message} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}

export default DaftarRisiko;
