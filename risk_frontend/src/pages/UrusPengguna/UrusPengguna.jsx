import { useState, useEffect, useMemo } from "react";
import api from "../../api/api";
import {
  Pencil,
  Trash2,
  Users,
  Search,
  UserPlus,
  KeyRound,
  UserX,
  UserCheck,
  Copy,
  Check,
  Lock,
} from "lucide-react";
import PageHeader from "@/components/ui/page-header";
import Toast from "@/components/ui/toast";
import EmptyState from "@/components/ui/empty-state";
import ConfirmModal from "@/components/ui/confirm-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import PemilihGambar from "@/components/PemilihGambar";
import { getAuthUser } from "@/utils/auth";
import { formatDate } from "@/utils/formatters";
import { SYARAT_KATALALUAN, katalaluanMematuhiPolisi } from "@/constants/katalaluan";

// Peranan berskop kumpulan: syarikat ditetapkan kepada UKM Holdings
const PERANAN_KUMPULAN = ["Admin", "Executive", "Viewer"];
// Peranan terhad: data diasingkan ikut syarikat, jadi syarikat wajib dipilih
const PERANAN_TERHAD = ["Staff", "Ketua Subsidiari"];

const BORANG_KOSONG = {
  staff_id: "",
  nama_penuh: "",
  katalaluan: "",
  peranan_id: "",
  syarikat_id: "",
  profile_pic: null,
};

const TAPISAN_STATUS = [
  { nilai: "", label: "Semua Status" },
  { nilai: "aktif", label: "Aktif" },
  { nilai: "tidak_aktif", label: "Tidak Aktif" },
  { nilai: "dikunci", label: "Dikunci" },
  { nilai: "perlu_tukar", label: "Belum Tukar Kata Laluan" },
];

const padanStatus = (u, status) => {
  switch (status) {
    case "aktif":
      return u.is_aktif;
    case "tidak_aktif":
      return !u.is_aktif;
    case "dikunci":
      return u.dikunci;
    case "perlu_tukar":
      return u.perlu_tukar_katalaluan;
    default:
      return true;
  }
};

function StatusPengguna({ u }) {
  return (
    <div className="flex flex-wrap gap-1">
      {u.is_aktif ? (
        <Badge variant="success">Aktif</Badge>
      ) : (
        <Badge variant="destructive">Tidak Aktif</Badge>
      )}
      {u.dikunci && (
        <Badge variant="warning" title="Terlalu banyak percubaan log masuk gagal">
          <Lock size={11} className="mr-1" /> Dikunci
        </Badge>
      )}
      {u.perlu_tukar_katalaluan && (
        <Badge variant="outline" title="Masih menggunakan kata laluan sementara">
          Belum tukar kata laluan
        </Badge>
      )}
    </div>
  );
}

function UrusPengguna() {
  const penggunaSemasaId = getAuthUser()?.userId;

  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [subsidiaries, setSubsidiaries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterRoleId, setFilterRoleId] = useState("");
  const [filterSubsidiaryId, setFilterSubsidiaryId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Borang tambah / edit
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState(BORANG_KOSONG);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState("");
  const [removeProfileFlag, setRemoveProfileFlag] = useState(false);
  const [ralatGambar, setRalatGambar] = useState("");

  // Pengesahan tindakan (padam / reset / aktif-nyahaktif)
  const [tindakan, setTindakan] = useState(null); // { jenis, user }

  // Paparan kata laluan sementara (sekali sahaja)
  const [kataLaluanSementara, setKataLaluanSementara] = useState(null); // { user, katalaluan, sebab }
  const [disalin, setDisalin] = useState(false);

  const [toast, setToast] = useState(null);

  useEffect(() => {
    const muat = async () => {
      try {
        const [r, s, u] = await Promise.all([
          api.get("/roles"),
          api.get("/syarikat"),
          api.get("/users"),
        ]);
        setRoles(r.data);
        setSubsidiaries(s.data);
        setUsers(u.data);
      } catch (err) {
        setToast({
          variant: "error",
          title: err.response?.data?.error || "Gagal memuatkan senarai pengguna.",
        });
      } finally {
        setLoading(false);
      }
    };
    muat();
  }, []);

  const namaPeranan = (perananId) =>
    roles.find((r) => r.peranan_id === Number(perananId))?.nama_peranan || "";
  const ukmHoldings = subsidiaries.find((s) => s.nama_syarikat === "UKM Holdings");

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        (u.nama_penuh.toLowerCase().includes(q) || u.staff_id.toLowerCase().includes(q)) &&
        (!filterRoleId || u.peranan_id === Number(filterRoleId)) &&
        (!filterSubsidiaryId || u.syarikat_id === Number(filterSubsidiaryId)) &&
        padanStatus(u, filterStatus)
    );
  }, [users, searchQuery, filterRoleId, filterSubsidiaryId, filterStatus]);

  const ringkasan = useMemo(
    () => ({
      jumlah: users.length,
      tidakAktif: users.filter((u) => !u.is_aktif).length,
      dikunci: users.filter((u) => u.dikunci).length,
      perluTukar: users.filter((u) => u.perlu_tukar_katalaluan).length,
    }),
    [users]
  );

  const gantiPengguna = (dikemaskini) =>
    setUsers((senarai) =>
      senarai.map((u) => (u.pengguna_id === dikemaskini.pengguna_id ? dikemaskini : u))
    );

  const ralatDari = (err, lalai) => err.response?.data?.error || lalai;

  /* ---------- Borang ---------- */

  const openModal = (user) => {
    setSelectedUser(user);
    setFormError("");
    setRemoveProfileFlag(false);
    if (user) {
      setFormData({
        staff_id: user.staff_id,
        nama_penuh: user.nama_penuh,
        katalaluan: "",
        peranan_id: user.peranan_id,
        syarikat_id: user.syarikat_id ?? "",
        profile_pic: null,
      });
      setPreview(user.profile_pic ? `data:image/png;base64,${user.profile_pic}` : "");
    } else {
      setFormData(BORANG_KOSONG);
      setPreview("");
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedUser(null);
    setFormError("");
    setPreview("");
    setRemoveProfileFlag(false);
    setRalatGambar("");
  };

  const handleFileChange = (file) => {
    setFormData((f) => ({ ...f, profile_pic: file }));
    setPreview(URL.createObjectURL(file));
    setRemoveProfileFlag(false);
  };

  const handleRoleChange = (roleId) => {
    const nama = namaPeranan(roleId);
    setFormData((f) => ({
      ...f,
      peranan_id: roleId ? Number(roleId) : "",
      syarikat_id: PERANAN_KUMPULAN.includes(nama)
        ? (ukmHoldings?.syarikat_id ?? "")
        : PERANAN_KUMPULAN.includes(namaPeranan(f.peranan_id))
          ? ""
          : f.syarikat_id,
    }));
  };

  const perananDipilih = namaPeranan(formData.peranan_id);
  const syarikatDikunci = PERANAN_KUMPULAN.includes(perananDipilih);
  const syarikatWajib = PERANAN_TERHAD.includes(perananDipilih);
  const suntingDiriSendiri = selectedUser && selectedUser.pengguna_id === penggunaSemasaId;

  const sahkanBorang = () => {
    if (!formData.staff_id.trim()) return "ID Staf diperlukan.";
    if (/\s/.test(formData.staff_id.trim())) return "ID Staf tidak boleh mengandungi ruang kosong.";
    if (!formData.nama_penuh.trim()) return "Nama penuh diperlukan.";
    if (!formData.peranan_id) return "Sila pilih peranan.";
    if (syarikatWajib && !formData.syarikat_id)
      return `Sila pilih syarikat untuk peranan ${perananDipilih}.`;
    if (!selectedUser && formData.katalaluan && !katalaluanMematuhiPolisi(formData.katalaluan))
      return "Kata laluan sementara tidak mematuhi polisi kata laluan.";
    return null;
  };

  const handleSave = async () => {
    const ralat = sahkanBorang();
    if (ralat) {
      setFormError(ralat);
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const data = new FormData();
      data.append("staff_id", formData.staff_id.trim());
      data.append("nama_penuh", formData.nama_penuh.trim());
      data.append("peranan_id", formData.peranan_id);
      data.append("syarikat_id", formData.syarikat_id ?? "");
      if (!selectedUser && formData.katalaluan) data.append("katalaluan", formData.katalaluan);
      if (formData.profile_pic) data.append("gambar_profil", formData.profile_pic);
      if (removeProfileFlag) data.append("hapus_gambar", "true");
      const config = { headers: { "Content-Type": "multipart/form-data" } };

      if (selectedUser) {
        const res = await api.put(`/users/${selectedUser.pengguna_id}`, data, config);
        gantiPengguna(res.data);
        closeModal();
        setToast({ variant: "success", title: "Maklumat pengguna berjaya dikemaskini." });
      } else {
        const res = await api.post("/users", data, config);
        const { katalaluan_sementara, ...baru } = res.data;
        setUsers((senarai) => [...senarai, baru]);
        closeModal();
        if (katalaluan_sementara) {
          setDisalin(false);
          setKataLaluanSementara({ user: baru, katalaluan: katalaluan_sementara, sebab: "baharu" });
        } else {
          setToast({
            variant: "success",
            title: "Pengguna berjaya ditambah.",
            message: "Pengguna perlu menukar kata laluan semasa log masuk pertama.",
          });
        }
      }
    } catch (err) {
      setFormError(ralatDari(err, "Gagal menyimpan maklumat pengguna."));
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Tindakan akaun ---------- */

  const laksanaTindakan = async () => {
    if (!tindakan) return;
    const { jenis, user } = tindakan;
    setTindakan(null);
    try {
      if (jenis === "padam") {
        await api.delete(`/users/${user.pengguna_id}`);
        setUsers((senarai) => senarai.filter((u) => u.pengguna_id !== user.pengguna_id));
        setToast({ variant: "success", title: `${user.nama_penuh} berjaya dipadam.` });
      } else if (jenis === "reset") {
        const res = await api.post(`/users/${user.pengguna_id}/reset-katalaluan`);
        gantiPengguna(res.data.pengguna);
        setDisalin(false);
        setKataLaluanSementara({
          user: res.data.pengguna,
          katalaluan: res.data.katalaluan_sementara,
          sebab: "reset",
        });
      } else if (jenis === "status") {
        const res = await api.patch(`/users/${user.pengguna_id}/status`, {
          is_aktif: !user.is_aktif,
        });
        gantiPengguna(res.data);
        setToast({
          variant: "success",
          title: res.data.is_aktif
            ? `Akaun ${user.nama_penuh} diaktifkan semula.`
            : `Akaun ${user.nama_penuh} dinyahaktifkan.`,
        });
      }
    } catch (err) {
      setToast({ variant: "error", title: ralatDari(err, "Tindakan gagal. Sila cuba semula.") });
    }
  };

  const kandunganPengesahan = (() => {
    if (!tindakan) return {};
    const { jenis, user } = tindakan;
    if (jenis === "padam")
      return {
        title: "Padam pengguna",
        description: `Padam akaun ${user.nama_penuh} (${user.staff_id})? Pengguna tidak lagi boleh log masuk dan ID Staf ini tidak boleh digunakan semula. Untuk menggantung akses sementara, gunakan Nyahaktif.`,
        confirmText: "Padam",
        variant: "destructive",
        icon: "destructive",
      };
    if (jenis === "reset")
      return {
        title: "Tetapkan semula kata laluan",
        description: `Jana kata laluan sementara baharu untuk ${user.nama_penuh}? Kata laluan lama tidak lagi sah, sesi aktif pengguna ditamatkan dan akaun dibuka kunci. Pengguna perlu menukar kata laluan semasa log masuk.`,
        confirmText: "Jana kata laluan",
        variant: "warning",
        icon: "warning",
      };
    return user.is_aktif
      ? {
          title: "Nyahaktif akaun",
          description: `Nyahaktif akaun ${user.nama_penuh}? Pengguna akan dilog keluar serta-merta dan tidak boleh log masuk sehingga diaktifkan semula. Data dan sejarah pengguna kekal.`,
          confirmText: "Nyahaktif",
          variant: "destructive",
          icon: "warning",
        }
      : {
          title: "Aktifkan akaun",
          description: `Aktifkan semula akaun ${user.nama_penuh}? Pengguna boleh log masuk semula dengan kata laluan sedia ada.`,
          confirmText: "Aktifkan",
          variant: "default",
          icon: "info",
        };
  })();

  const salinKataLaluan = async () => {
    try {
      await navigator.clipboard.writeText(kataLaluanSementara.katalaluan);
      setDisalin(true);
    } catch {
      setDisalin(false);
    }
  };

  const namaSyarikat = (id) =>
    subsidiaries.find((s) => s.syarikat_id === id)?.nama_syarikat || "-";

  return (
    <div>
      <PageHeader
        title="Pengurusan Pengguna"
        description="Tambah pengguna, tetapkan peranan & syarikat, serta urus akses log masuk"
        actions={
          <Button onClick={() => openModal(null)}>
            <UserPlus size={16} /> Tambah Pengguna
          </Button>
        }
      />

      {/* Ringkasan status */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Jumlah pengguna", nilai: ringkasan.jumlah, status: "" },
          { label: "Tidak aktif", nilai: ringkasan.tidakAktif, status: "tidak_aktif" },
          { label: "Dikunci", nilai: ringkasan.dikunci, status: "dikunci" },
          { label: "Belum tukar kata laluan", nilai: ringkasan.perluTukar, status: "perlu_tukar" },
        ].map((k) => (
          <button
            key={k.label}
            type="button"
            onClick={() => setFilterStatus(k.status)}
            className={`rounded-xl border bg-card p-3 text-left shadow-sm transition-colors hover:border-primary ${
              filterStatus === k.status ? "border-primary" : ""
            }`}
          >
            <div className="text-xs text-muted-foreground">{k.label}</div>
            <div className="text-xl font-semibold text-foreground">{k.nilai}</div>
          </button>
        ))}
      </div>

      {/* Bar penapis */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Cari nama atau ID Staf"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={filterRoleId}
          onChange={(e) => setFilterRoleId(e.target.value)}
          className="h-9 w-[170px]"
        >
          <option value="">Semua Peranan</option>
          {roles.map((r) => (
            <option key={r.peranan_id} value={r.peranan_id}>
              {r.nama_peranan}
            </option>
          ))}
        </Select>

        <Select
          value={filterSubsidiaryId}
          onChange={(e) => setFilterSubsidiaryId(e.target.value)}
          className="h-9 w-[170px]"
        >
          <option value="">Semua Syarikat</option>
          {subsidiaries.map((s) => (
            <option key={s.syarikat_id} value={s.syarikat_id}>
              {s.nama_syarikat}
            </option>
          ))}
        </Select>

        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-9 w-[200px]"
        >
          {TAPISAN_STATUS.map((s) => (
            <option key={s.nilai} value={s.nilai}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Jadual */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Bil</TableHead>
              <TableHead>Pengguna</TableHead>
              <TableHead>Peranan</TableHead>
              <TableHead>Syarikat</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Log Masuk Terakhir</TableHead>
              <TableHead className="w-[170px] text-center">Tindakan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32">
                  <EmptyState
                    icon={Users}
                    title={loading ? "Memuatkan pengguna..." : "Tiada pengguna dijumpai"}
                    description={loading ? "" : "Tiada pengguna sepadan dengan tapisan anda."}
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((u, i) => {
                const diriSendiri = u.pengguna_id === penggunaSemasaId;
                return (
                  <TableRow key={u.pengguna_id} className={u.is_aktif ? "" : "opacity-60"}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={u.profile_pic ? `data:image/png;base64,${u.profile_pic}` : ""}
                          nama={u.nama_penuh}
                        />
                        <div>
                          <div className="font-medium text-foreground">
                            {u.nama_penuh}
                            {diriSendiri && (
                              <span className="ml-1 text-xs text-muted-foreground">(Anda)</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{u.staff_id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{u.nama_peranan}</Badge>
                    </TableCell>
                    <TableCell>{namaSyarikat(u.syarikat_id)}</TableCell>
                    <TableCell>
                      <StatusPengguna u={u} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.log_masuk_terakhir ? formatDate(u.log_masuk_terakhir) : "Belum pernah"}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex items-center justify-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:text-primary"
                          onClick={() => openModal(u)}
                          title="Edit maklumat"
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-600 hover:text-amber-600"
                          onClick={() => setTindakan({ jenis: "reset", user: u })}
                          disabled={diriSendiri}
                          title={
                            diriSendiri
                              ? "Tukar kata laluan sendiri melalui menu Profil"
                              : "Tetapkan semula kata laluan"
                          }
                        >
                          <KeyRound size={16} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setTindakan({ jenis: "status", user: u })}
                          disabled={diriSendiri}
                          title={u.is_aktif ? "Nyahaktif akaun" : "Aktifkan akaun"}
                        >
                          {u.is_aktif ? <UserX size={16} /> : <UserCheck size={16} />}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setTindakan({ jenis: "padam", user: u })}
                          disabled={diriSendiri}
                          title="Padam pengguna"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Borang tambah / edit */}
      <Dialog open={modalOpen} onOpenChange={(buka) => !buka && closeModal()}>
        <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-[560px]">
          <DialogHeader className="border-b px-6 py-4 pr-12 text-left">
            <DialogTitle>{selectedUser ? "Edit pengguna" : "Tambah pengguna"}</DialogTitle>
            <DialogDescription>
              {selectedUser
                ? "Kemas kini maklumat & akses pengguna. Kata laluan ditetapkan semula melalui senarai."
                : "Pengguna baharu perlu menukar kata laluan sementara semasa log masuk pertama."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 px-6 py-5">
            <section className="grid gap-3">
              <h3 className="text-sm font-semibold text-foreground">Gambar profil</h3>
              <PemilihGambar
                src={preview}
                nama={formData.nama_penuh}
                onPilih={handleFileChange}
                onBuang={() => {
                  setFormData((f) => ({ ...f, profile_pic: null }));
                  setPreview("");
                  setRemoveProfileFlag(true);
                }}
                onRalat={setRalatGambar}
                disabled={saving}
              />
              {ralatGambar && <p className="text-xs text-destructive">{ralatGambar}</p>}
            </section>

            <section className="grid gap-3">
              <h3 className="text-sm font-semibold text-foreground">Maklumat pengguna</h3>
              <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                <div className="grid gap-1.5">
                  <Label htmlFor="staff_id">ID Staf *</Label>
                  <Input
                    id="staff_id"
                    placeholder="cth. UKMH001"
                    value={formData.staff_id}
                    onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="nama_penuh">Nama Penuh *</Label>
                  <Input
                    id="nama_penuh"
                    value={formData.nama_penuh}
                    onChange={(e) => setFormData({ ...formData, nama_penuh: e.target.value })}
                  />
                </div>
              </div>
            </section>

            <section className="grid gap-3">
              <h3 className="text-sm font-semibold text-foreground">Akses</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid content-start gap-1.5">
                  <Label htmlFor="peranan_id">Peranan *</Label>
                  <Select
                    id="peranan_id"
                    value={formData.peranan_id}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    disabled={suntingDiriSendiri}
                  >
                    <option value="">Pilih Peranan</option>
                    {roles.map((r) => (
                      <option key={r.peranan_id} value={r.peranan_id}>
                        {r.nama_peranan}
                      </option>
                    ))}
                  </Select>
                  {suntingDiriSendiri && (
                    <p className="text-xs text-muted-foreground">
                      Anda tidak boleh menukar peranan akaun sendiri.
                    </p>
                  )}
                </div>
                <div className="grid content-start gap-1.5">
                  <Label htmlFor="syarikat_id">Syarikat {syarikatWajib ? "*" : ""}</Label>
                  <Select
                    id="syarikat_id"
                    value={formData.syarikat_id}
                    onChange={(e) => setFormData({ ...formData, syarikat_id: e.target.value })}
                    disabled={syarikatDikunci}
                  >
                    <option value="">Pilih Syarikat</option>
                    {subsidiaries.map((s) => (
                      <option key={s.syarikat_id} value={s.syarikat_id}>
                        {s.nama_syarikat}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              {(syarikatDikunci || syarikatWajib) && (
                <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  {syarikatDikunci
                    ? `${perananDipilih} melihat semua syarikat; syarikat ditetapkan kepada UKM Holdings.`
                    : `${perananDipilih} hanya boleh melihat risiko syarikat yang dipilih.`}
                </p>
              )}
            </section>

            {!selectedUser && (
              <section className="grid gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Kata laluan sementara</h3>
                  <p className="text-xs text-muted-foreground">
                    Pilihan. Biarkan kosong dan sistem akan menjana kata laluan rawak yang dipaparkan
                    sekali selepas simpan.
                  </p>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="katalaluan" className="sr-only">
                    Kata laluan sementara
                  </Label>
                  <Input
                    id="katalaluan"
                    type="text"
                    autoComplete="off"
                    placeholder="Biarkan kosong untuk dijana automatik"
                    value={formData.katalaluan}
                    onChange={(e) => setFormData({ ...formData, katalaluan: e.target.value })}
                  />
                </div>
                {formData.katalaluan && (
                  <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    {SYARAT_KATALALUAN.map((syarat) => {
                      const lulus = syarat.uji(formData.katalaluan);
                      return (
                        <li
                          key={syarat.label}
                          className={`flex items-center gap-1.5 ${lulus ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}
                        >
                          {lulus ? <Check size={13} /> : <span className="h-1 w-1 rounded-full bg-current" />}
                          {syarat.label}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}

            {formError && (
              <div
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
              >
                {formError}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 border-t px-6 py-4 sm:gap-2">
            <Button variant="outline" onClick={closeModal} disabled={saving}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pengesahan tindakan */}
      <ConfirmModal
        open={Boolean(tindakan)}
        onOpenChange={(buka) => !buka && setTindakan(null)}
        title={kandunganPengesahan.title}
        description={kandunganPengesahan.description}
        confirmText={kandunganPengesahan.confirmText}
        cancelText="Batal"
        variant={kandunganPengesahan.variant}
        icon={kandunganPengesahan.icon}
        onConfirm={laksanaTindakan}
      />

      {/* Kata laluan sementara — dipaparkan sekali sahaja */}
      <Dialog
        open={Boolean(kataLaluanSementara)}
        onOpenChange={(buka) => !buka && setKataLaluanSementara(null)}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {kataLaluanSementara?.sebab === "baharu"
                ? "Pengguna berjaya ditambah"
                : "Kata laluan berjaya ditetapkan semula"}
            </DialogTitle>
            <DialogDescription>
              Serahkan butiran log masuk ini kepada {kataLaluanSementara?.user.nama_penuh} secara
              selamat. Kata laluan ini hanya dipaparkan <strong>sekali</strong> dan pengguna wajib
              menukarnya semasa log masuk.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">ID Staf</span>
              <span className="font-medium">{kataLaluanSementara?.user.staff_id}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Kata laluan sementara</span>
              <span className="flex items-center gap-2">
                <code className="rounded bg-background px-2 py-1 font-mono text-base tracking-wider">
                  {kataLaluanSementara?.katalaluan}
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={salinKataLaluan}
                  title="Salin"
                >
                  {disalin ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                </Button>
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setKataLaluanSementara(null)}>Selesai</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && (
        <div className="fixed right-4 top-[64px] z-50 w-[320px]">
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

export default UrusPengguna;
