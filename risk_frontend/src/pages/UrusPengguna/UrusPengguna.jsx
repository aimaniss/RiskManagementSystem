import { useState, useEffect } from "react";
import api from "../../api/api";
import { UserCircle, Pencil, Trash2, Users, Search, UserPlus } from "lucide-react";
import PageHeader from "@/components/ui/page-header";
import Toast from "@/components/ui/toast";
import EmptyState from "@/components/ui/empty-state";
import ConfirmModal from "@/components/ui/confirm-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";

function UrusPengguna() {
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [subsidiaries, setSubsidiaries] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter states
  const [filterRoleId, setFilterRoleId] = useState("");
  const [filterSubsidiaryId, setFilterSubsidiaryId] = useState("");
  const [filterSubsidiaryLocked, setFilterSubsidiaryLocked] = useState(false);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [, setModalType] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const [formData, setFormData] = useState({
    staff_id: "",
    nama_penuh: "",
    katalaluan: "",
    peranan_id: "",
    syarikat_id: "",
    profile_pic: null,
  });
  const [preview, setPreview] = useState("");
  const [subsidiaryLocked, setSubsidiaryLocked] = useState(false);
  const [removeProfileFlag, setRemoveProfileFlag] = useState(false);

  const [toast, setToast] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchRoles();
    fetchSubsidiaries();
    fetchUsers();
  }, [token]);

  const fetchRoles = async () => {
    try {
      const res = await api.get("/roles");
      setRoles(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSubsidiaries = async () => {
    try {
      const res = await api.get("/syarikat");
      setSubsidiaries(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users");
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Table filter
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.nama_penuh.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.staff_id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = filterRoleId ? u.peranan_id === parseInt(filterRoleId) : true;
    const matchesSubsidiary = filterSubsidiaryId
      ? u.syarikat_id === parseInt(filterSubsidiaryId)
      : true;

    return matchesSearch && matchesRole && matchesSubsidiary;
  });

  // Filter dropdown change
  const handleFilterRoleChange = (roleId) => {
    setFilterRoleId(roleId);
    const role = roles.find((r) => r.peranan_id === parseInt(roleId));

    if (role && ["Admin", "Executive", "Viewer"].includes(role.nama_peranan)) {
      const ukm = subsidiaries.find((s) => s.nama_syarikat === "UKM Holdings");
      if (ukm) setFilterSubsidiaryId(ukm.syarikat_id.toString());
      setFilterSubsidiaryLocked(true);
    } else {
      setFilterSubsidiaryId("");
      setFilterSubsidiaryLocked(false);
    }
  };

  // Modal open
  const openModal = (type, user) => {
    setModalType(type);
    setSelectedUser(user);

    if (type === "edit" && user) {
      setFormData({ ...user, profile_pic: null });
      setPreview(user.profile_pic ? `data:image/png;base64,${user.profile_pic}` : "");
      setRemoveProfileFlag(false);

      const role = roles.find((r) => r.peranan_id === user.peranan_id);
      if (role && ["Admin", "Executive", "Viewer"].includes(role.nama_peranan)) {
        const ukm = subsidiaries.find((s) => s.nama_syarikat === "UKM Holdings");
        if (ukm) setFormData((f) => ({ ...f, syarikat_id: ukm.syarikat_id }));
        setSubsidiaryLocked(true);
      } else {
        setSubsidiaryLocked(false);
      }
    } else {
      setFormData({
        staff_id: "",
        nama_penuh: "",
        katalaluan: "",
        peranan_id: "",
        syarikat_id: "",
        profile_pic: null,
      });
      setPreview("");
      setRemoveProfileFlag(false);
      setSubsidiaryLocked(false);
    }

    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedUser(null);
    setModalType("");
    setSubsidiaryLocked(false);
    setRemoveProfileFlag(false);
    setPreview("");
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, profile_pic: file });
      setPreview(URL.createObjectURL(file));
      setRemoveProfileFlag(false);
    }
  };

  const handleRoleChange = (roleId) => {
    const role = roles.find((r) => r.peranan_id === parseInt(roleId));
    setFormData((f) => ({ ...f, peranan_id: parseInt(roleId) }));

    if (role && ["Admin", "Executive", "Viewer"].includes(role.nama_peranan)) {
      const ukm = subsidiaries.find((s) => s.nama_syarikat === "UKM Holdings");
      if (ukm) setFormData((f) => ({ ...f, syarikat_id: ukm.syarikat_id }));
      setSubsidiaryLocked(true);
    } else {
      setFormData((f) => ({ ...f, syarikat_id: "" }));
      setSubsidiaryLocked(false);
    }
  };

  const handleSave = async () => {
    try {
      const data = new FormData();
      data.append("staff_id", formData.staff_id);
      data.append("nama_penuh", formData.nama_penuh);
      data.append("katalaluan", formData.katalaluan);
      data.append("peranan_id", formData.peranan_id);
      data.append("syarikat_id", formData.syarikat_id);
      if (formData.profile_pic) data.append("gambar_profil", formData.profile_pic);
      if (removeProfileFlag) data.append("hapus_gambar", "true");

      let res;
      if (selectedUser) {
        res = await api.put(
          `/users/${selectedUser.pengguna_id}`,
          data,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        setUsers(
          users.map((u) => (u.pengguna_id === selectedUser.pengguna_id ? res.data : u))
        );
      } else {
        res = await api.post("/users", data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setUsers([...users, res.data]);
      }

      closeModal();
      setToast({ variant: "success", title: "Maklumat pengguna berjaya disimpan." });
    } catch (err) {
      console.error(err);
      setToast({ variant: "error", title: "Gagal menyimpan maklumat pengguna." });
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/users/${selectedUser.pengguna_id}`);
      setUsers(users.filter((u) => u.pengguna_id !== selectedUser.pengguna_id));
      closeModal();
      setToast({ variant: "success", title: "Maklumat pengguna berjaya dipadam." });
    } catch (err) {
      console.error(err);
      setToast({ variant: "error", title: "Gagal memadam maklumat pengguna." });
    }
  };

  // ConfirmModal: open delete confirmation
  const openDeleteConfirm = (user) => {
    setSelectedUser(user);
    setDeleteModalOpen(true);
  };
  const roleNameMap = {
    "Ketua Subsidiari": "Head Subsidiary",
  };

  const getDisplayRoleName = (roleName) => {
    return roleNameMap[roleName] || roleName;
  };

  return (
    <div>
      <PageHeader
        title="Pengurusan Pengguna"
        description="Kemaskini maklumat pengguna dan peranan"
        actions={
          <Button onClick={() => openModal("edit", null)}>
            <UserPlus size={16} /> Tambah Pengguna
          </Button>
        }
      />

      {/* Bar penapis */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Carian Nama Penuh atau Staff ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={filterRoleId}
          onChange={(e) => handleFilterRoleChange(e.target.value)}
          className="h-9 w-[170px]"
        >
          <option value="">Pilih Peranan</option>
          {roles.map((r) => (
            <option key={r.peranan_id} value={r.peranan_id}>
              {getDisplayRoleName(r.nama_peranan)}
            </option>
          ))}
        </Select>

        <Select
          value={filterSubsidiaryId}
          onChange={(e) => setFilterSubsidiaryId(e.target.value)}
          className="h-9 w-[170px]"
          disabled={filterSubsidiaryLocked}
        >
          <option value="">Pilih Syarikat</option>
          {subsidiaries.map((s) => (
            <option key={s.syarikat_id} value={s.syarikat_id}>
              {s.nama_syarikat}
            </option>
          ))}
        </Select>
      </div>

      {/* Jadual */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Bil</TableHead>
              <TableHead>Nama Penuh</TableHead>
              <TableHead>Peranan</TableHead>
              <TableHead>Syarikat</TableHead>
              <TableHead>Staff ID</TableHead>
              <TableHead>Kata Laluan</TableHead>
              <TableHead className="w-[110px] text-center">Tindakan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32">
                  <EmptyState
                    icon={Users}
                    title="Tiada pengguna dijumpai"
                    description="Tiada pengguna sepadan dengan carian anda."
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((u, i) => {
                const subsidiary = subsidiaries.find(
                  (s) => s.syarikat_id === u.syarikat_id
                );
                const profileSrc = u.profile_pic
                  ? `data:image/png;base64,${u.profile_pic}`
                  : null;
                return (
                  <TableRow key={i}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {profileSrc ? (
                          <img src={profileSrc} alt="profile" className="h-9 w-9 shrink-0 rounded-full border object-cover" />
                        ) : (
                          <UserCircle className="h-9 w-9 shrink-0 text-muted-foreground" />
                        )}
                        <span className="font-medium text-foreground">{u.nama_penuh}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{getDisplayRoleName(u.nama_peranan)}</Badge>
                    </TableCell>
                    <TableCell>{subsidiary ? subsidiary.nama_syarikat : "-"}</TableCell>
                    <TableCell>{u.staff_id}</TableCell>
                    <TableCell>{u.katalaluan || "-"}</TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex items-center justify-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:text-primary"
                          onClick={() => openModal("edit", u)}
                          title="Edit Pengguna"
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => openDeleteConfirm(u)}
                          title="Padam Pengguna"
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

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-[380px] max-w-[90%] flex-col gap-4 overflow-y-auto rounded-xl border bg-card p-6 shadow-lg">
            <h2 className="text-base font-semibold text-foreground">
              {selectedUser ? "Edit Pengguna" : "Tambah Pengguna"}
            </h2>

            {/* Muat Naik Gambar Profil */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="relative inline-block">
                {preview || (formData.profile_pic && !removeProfileFlag) ? (
                  <img
                    src={
                      preview
                        ? preview
                        : formData.profile_pic instanceof File
                        ? URL.createObjectURL(formData.profile_pic)
                        : `data:image/png;base64,${formData.profile_pic}`
                    }
                    alt="preview"
                    className="h-28 w-28 rounded-full border-[3px] border-primary object-cover"
                  />
                ) : (
                  <UserCircle className="h-28 w-28 text-muted-foreground" />
                )}

                {(preview || (formData.profile_pic && !removeProfileFlag)) && (
                  <button
                    type="button"
                    title="Buang Gambar Profil"
                    className="absolute -right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border bg-card p-0.5 text-destructive shadow-sm transition-transform hover:scale-110"
                    onClick={() => {
                      setFormData({ ...formData, profile_pic: null });
                      setPreview("");
                      setRemoveProfileFlag(true);
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground"
              />
            </div>

            <Input
              placeholder="Staff ID"
              value={formData.staff_id}
              onChange={(e) =>
                setFormData({ ...formData, staff_id: e.target.value })
              }
            />
            <Input
              placeholder="Nama Penuh"
              value={formData.nama_penuh}
              onChange={(e) =>
                setFormData({ ...formData, nama_penuh: e.target.value })
              }
            />
            <Input
              placeholder="Kata Laluan"
              value={formData.katalaluan}
              onChange={(e) =>
                setFormData({ ...formData, katalaluan: e.target.value })
              }
            />

            <Select
              value={formData.peranan_id}
              onChange={(e) => handleRoleChange(e.target.value)}
            >
              <option value="">Pilih Peranan</option>
              {roles.map((r) => (
                <option key={r.peranan_id} value={r.peranan_id}>
                  {getDisplayRoleName(r.nama_peranan)}
                </option>
              ))}
            </Select>

            <Select
              value={formData.syarikat_id}
              onChange={(e) =>
                setFormData({ ...formData, syarikat_id: e.target.value })
              }
              disabled={subsidiaryLocked}
            >
              <option value="">Pilih Syarikat</option>
              {subsidiaries.map((s) => (
                <option key={s.syarikat_id} value={s.syarikat_id}>
                  {s.nama_syarikat}
                </option>
              ))}
            </Select>

            <div className="mt-2 flex justify-end gap-2">
              <Button variant="outline" onClick={closeModal}>Batal</Button>
              <Button onClick={handleSave}>Simpan</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Pengesahan Padam"
        description={`Adakah anda pasti mahu memadam ${selectedUser?.nama_penuh}?`}
        confirmText="Padam"
        cancelText="Batal"
        variant="destructive"
        icon="destructive"
        onConfirm={handleDelete}
        onCancel={closeModal}
      />

      {toast && (
        <div className="fixed top-[64px] right-4 z-50 w-[320px]">
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
