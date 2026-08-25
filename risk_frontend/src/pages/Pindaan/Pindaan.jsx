import { useState, useEffect, useMemo } from "react";
import api from "../../api/api";
import { FilePenLine, ShieldAlert, ShieldCheck, Archive, Eye } from "lucide-react";

// Komponen modular
import MohonPindaanModal from "./MohonPindaanModal";
import PindaanFormModal from "./PindaanFormModal";
import PindaanDetailsModal from "./PindaanDetailsModal";

// UI Komponen
import Toast from "@/components/ui/toast";
import LoadingSpinner from "@/components/ui/loading-spinner";
import AlertBanner from "@/components/ui/alert-banner";
import EmptyState from "@/components/ui/empty-state";
import PageHeader from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

import { getAuthUser } from "../../utils/auth";
import { riskMatrix } from "../../constants/riskMatrix";


function PindaanRisiko() {
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserSyarikatId, setCurrentUserSyarikatId] = useState(null);
  const [allRisks, setAllRisks] = useState([]);
  const [loadingRisks, setLoadingRisks] = useState(false);
  const [amendments, setAmendments] = useState([]);
  const [loadingAmendments, setLoadingAmendments] = useState(true);
  const [amendmentsError, setAmendmentsError] = useState(null);
  const [syarikatList, setSyarikatList] = useState([]);
  const [toast, setToast] = useState(null);
  
  
  const [filterStatus, setFilterStatus] = useState("Menunggu Kelulusan"); 
  const [filterSyarikat, setFilterSyarikat] = useState("Semua"); 

 
  const [amendmentStats, setAmendmentStats] = useState({
    menunggu: 0,
    diluluskan: 0,
    ditolak: 0,
  });
  const [loadingStats, setLoadingStats] = useState(false);

  // State Modal
  const [isPindaanModalOpen, setIsPindaanModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isSelectRiskModalOpen, setIsSelectRiskModalOpen] = useState(false);
  const [selectedRiskForPindaan, setSelectedRiskForPindaan] = useState(null);
  const [selectedAmendment, setSelectedAmendment] = useState(null);

  // --- Decode token & load data awal ---
  useEffect(() => {
    const authUser = getAuthUser();
    let role = authUser?.roleTitle || "Unauthorized";
    let userId = authUser?.userId || null;
    let userSubsId = authUser?.syarikatId || null;

    if (!authUser) {
      role = "Unauthorized";
    } else if (role !== "Admin" && role !== "Executive" && role !== "Ketua Subsidiari" && role !== "Staff") {
      role = "Unauthorized";
    }

    setCurrentUserRole(role);
    setCurrentUserId(userId);
    setCurrentUserSyarikatId(userSubsId);

    if (role === "Admin" || role === "Executive") {
      fetchAllRisks();
      fetchAmendments(role, userId, "Menunggu Kelulusan", filterSyarikat);
      fetchSyarikatList();
      if (role === "Admin") {
        fetchAmendmentStats(); 
      }
    } else {
      setLoadingAmendments(false);
    }
  }, []); 


  const fetchSyarikatList = async () => {
    try {
      const res = await api.get("/syarikat");
      setSyarikatList(res.data || []);
    } catch (err) {
      console.error("Gagal fetch syarikat:", err);
    }
  };

  const fetchAmendmentStats = async () => {
    setLoadingStats(true);
    try {
      const res = await api.get("/pindaan/stats"); 
      setAmendmentStats({
        menunggu: res.data.menunggu || 0,
        diluluskan: res.data.diluluskan || 0,
        ditolak: res.data.ditolak || 0,
      });
    } catch (err) {
      console.error("Gagal fetch statistik pindaan:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchAllRisks = async () => {
    setLoadingRisks(true);
    setAllRisks([]);
    try {
      const response = await api.get("/pindaan/risks-for-amendment"); 

      const risksWithDetails = response.data.map((r) => ({
        ...r, 
        tahap_risiko: calculateTahapRisiko(
          r.skor_kebarangkalian,
          r.skor_impak
        ),
        risk_color: calculateRiskColor(r.skor_kebarangkalian, r.skor_impak),
      }));
      setAllRisks(risksWithDetails || []);
    } catch (err) {
      console.error("Gagal memuatkan senarai risiko:", err);
      setToast({ variant: "error", title: "Gagal Memuatkan", message: "Gagal memuatkan senarai risiko." });
    } finally {
      setLoadingRisks(false);
    }
  };

  const fetchAmendments = async (role, userId, statusFilter, syarikatFilter) => {
    setLoadingAmendments(true);
    setAmendmentsError(null);
    try {
      const params = {};
      
      if (statusFilter !== "Semua") params.status = statusFilter;
      
      if (role === "Admin" && syarikatFilter !== "Semua") {
        params.syarikat_id = syarikatFilter;
      }
      
      const response = await api.get("/pindaan", { params }); 
      setAmendments(response.data || []);
    } catch (err) {
      console.error("Gagal memuatkan senarai pindaan:", err);
      setAmendmentsError("Gagal memuatkan data. Sila cuba lagi.");
      setAmendments([]);
    } finally {
      setLoadingAmendments(false);
    }
  };

  // useEffect untuk memuat semula data apabila penapis berubah
  useEffect(() => {
    if (currentUserRole === "Admin" || currentUserRole === "Executive") {
      fetchAmendments(currentUserRole, currentUserId, filterStatus, filterSyarikat);
    }
  }, [filterStatus, filterSyarikat, currentUserRole, currentUserId]); 

  // --- Handlers ---
  const handlePindaanSubmitted = async (justifikasi, perubahanDicadang) => {
    const risikoId = selectedRiskForPindaan.risiko_id || selectedRiskForPindaan.id;
    if (!risikoId) { setToast({ variant: "error", title: "ID Tidak Sah", message: "ID Risiko tidak sah." }); return; }
    const payload = {
      justifikasi,
      perubahan: perubahanDicadang,
    };
    try {
      // API endpoint ialah /api/pindaan/:risk_id
      await api.post(`/pindaan/${risikoId}`, payload); 
      setToast({
        variant: "success",
        title: "Berjaya",
        message: `Permohonan Pindaan ${
          currentUserRole === "Admin" ? "dicipta dan diluluskan secara automatik" : "berjaya dihantar"
        }!`
      });
      setIsPindaanModalOpen(false);
      setSelectedRiskForPindaan(null);
      // Muat semula data (hanya jika Executive/Admin)
      if (currentUserRole === "Admin" || currentUserRole === "Executive") {
        fetchAmendments(currentUserRole, currentUserId, filterStatus, filterSyarikat);
        if (currentUserRole === "Admin") {
          fetchAmendmentStats(); 
        }
      }
    } catch (err) {
      console.error("Gagal hantar permohonan:", err.response?.data || err);
      setToast({
        variant: "error",
        title: "Gagal Menghantar",
        message: err.response?.data?.message || "Sila cuba lagi."
      });
    }
  };

  const handleViewDetails = (amendment) => {
    setSelectedAmendment(amendment);
    setIsDetailsModalOpen(true);
  };

  const handleApprovalAction = async (pindaanId, action, komen) => {
    // 'action' ialah 'meluluskan' atau 'menolak'
    const statusAction = action === "meluluskan" ? "approve" : "reject";
    const endpoint = `/pindaan/${pindaanId}/${statusAction}`;
    
    const payload = { komen_pelulus: komen }; 
    
    try {
      await api.put(endpoint, payload);
      setToast({ variant: "success", title: "Berjaya", message: `Permohonan #${pindaanId} berjaya ${action}.` });
      setIsDetailsModalOpen(false);
      // Muat semula data
      fetchAmendments(currentUserRole, currentUserId, filterStatus, filterSyarikat);
      if (currentUserRole === "Admin") {
        fetchAmendmentStats(); // Muat semula statistik
      }
    } catch (err) {
      console.error(`Gagal ${action} permohonan:`, err.response?.data || err);
      setToast({
        variant: "error",
        title: `Gagal ${action}`,
        message: err.response?.data?.message || "Sila cuba lagi."
      });
    }
  };

  const handleRiskSelected = (risk) => {
    setSelectedRiskForPindaan(risk);
    setIsSelectRiskModalOpen(false);
    setIsPindaanModalOpen(true);
  };

  // --- Fungsi Bantuan ---
  const calculateTahapRisiko = (skorK, skorI) => {
    const k = parseInt(skorK);
    const i = parseInt(skorI);
    if (riskMatrix[k] && riskMatrix[k][i]) {
      return riskMatrix[k][i].label; // R, S, T, atau ST
    }
    return "-"; 
  };

  const calculateRiskColor = (skorK, skorI) => {
    const k = parseInt(skorK);
    const i = parseInt(skorI);
    if (riskMatrix[k] && riskMatrix[k][i]) {
      return riskMatrix[k][i].color; // Kod warna
    }
    return "#f1f5f9"; 
  };
    
  // Logik untuk siapa yang boleh melihat halaman ini (Admin atau Executive)
  const canViewPage = currentUserRole === "Admin" || currentUserRole === "Executive";
  // Logik untuk siapa yang boleh memohon pindaan (Semua)
  const canApplyForAmendment = ["Admin", "Executive", "Ketua Subsidiari", "Staff"].includes(currentUserRole);

  if (currentUserRole === null)
    return <LoadingSpinner text="Memeriksa kebenaran akses..." />;
    
  if (!canApplyForAmendment)
    return (
      <div>
        <PageHeader title="Pindaan" description="Permohonan pindaan rekod risiko" />
        <AlertBanner variant="warning" title="Akses Ditolak" description="Anda tidak dibenarkan mengakses halaman ini." />
      </div>
    );

  return (
    <div>
      <PageHeader
        title="Pindaan"
        description="Permohonan pindaan rekod risiko"
        actions={
          <Button
            onClick={() => {
              fetchAllRisks(); 
              setIsSelectRiskModalOpen(true);
            }}
            disabled={loadingRisks}
          >
            <FilePenLine />
            {loadingRisks ? "Memuatkan Risiko..." : "Mohon Pindaan"}
          </Button>
        }
      />

      {currentUserRole === 'Admin' && (
        <StatsCardSection stats={amendmentStats} loading={loadingStats} />
      )}

      {/* --- SEKSYEN SENARAI PINDAAN (HANYA ADMIN/EXECUTIVE) --- */}
      {canViewPage ? (
        <AmendmentsListSection
          userRole={currentUserRole}
          currentUserId={currentUserId}
          // Props Penapis
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterSyarikat={filterSyarikat}
          setFilterSyarikat={setFilterSyarikat}
          syarikatList={syarikatList}
          // Props Jadual
          loading={loadingAmendments}
          error={amendmentsError}
          amendments={amendments}
          handleViewDetails={handleViewDetails}
        />
      ) : (
        // Paparan untuk Staff/Ketua Subsidiari yang hanya boleh Mohon Pindaan
        <div className="rounded-xl border bg-muted/40 p-4">
          <p className="text-sm text-muted-foreground">Anda hanya dibenarkan memohon pindaan, bukan melihat atau meluluskan senarai permohonan. Gunakan butang "Mohon Pindaan" di atas untuk memulakan permohonan.</p>
        </div>
      )}

      {/* --- Modals --- */}
      {isSelectRiskModalOpen && (
        <MohonPindaanModal
          isOpen={isSelectRiskModalOpen}
          onClose={() => setIsSelectRiskModalOpen(false)}
          risks={allRisks} 
          syarikatList={syarikatList}
          userRole={currentUserRole}
          userSyarikatId={currentUserSyarikatId}
          onRiskSelect={handleRiskSelected}
          customClass="modal-pilih-risiko"
        />
      )}
      {isPindaanModalOpen && selectedRiskForPindaan && (
        <PindaanFormModal
          isOpen={isPindaanModalOpen}
          risk={selectedRiskForPindaan}
          userRole={currentUserRole}
          onClose={() => setIsPindaanModalOpen(false)}
          onPindaanSubmitted={handlePindaanSubmitted}
        />
      )}
      {isDetailsModalOpen && selectedAmendment && (
        <PindaanDetailsModal
          isOpen={isDetailsModalOpen}
          amendment={selectedAmendment}
          userRole={currentUserRole}
          onClose={() => setIsDetailsModalOpen(false)}
          onAction={handleApprovalAction} 
        />
      )}

      {toast && (
        <div className="fixed top-[64px] right-4 z-50 max-w-sm">
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

// --- Komponen Kad Statistik ---
function StatsCardSection({ stats, loading }) {
  const cardData = [
    {
      title: "Menunggu Kelulusan",
      value: stats.menunggu,
      icon: ShieldAlert,
      chipClass: "bg-warning/10 text-warning",
    },
    {
      title: "Diluluskan",
      value: stats.diluluskan,
      icon: ShieldCheck,
      chipClass: "bg-success/10 text-success",
    },
    {
      title: "Ditolak / Arkib",
      value: stats.ditolak,
      icon: Archive,
      chipClass: "bg-destructive/10 text-destructive",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
      {cardData.map((card) => (
        <Card key={card.title} className="rounded-xl">
          <CardContent className="flex items-center gap-3 p-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.chipClass}`}>
              <card.icon size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground truncate">{card.title}</p>
              <p className="text-xl font-bold tracking-tight mt-0.5">
                {loading ? "..." : card.value}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}


// --- Komponen Senarai Pindaan ---
function AmendmentsListSection({
  userRole,
  currentUserId,
  // Props Penapis
  filterStatus,
  setFilterStatus,
  filterSyarikat,
  setFilterSyarikat,
  syarikatList,
  // Props Jadual
  loading,
  error,
  amendments,
  handleViewDetails,
}) {
  
  const displayAmendments = useMemo(() => {
    return amendments; 
  }, [amendments]);

  // 8 lajur untuk Admin (dengan Pemohon), 7 lajur untuk Executive (tanpa Pemohon)
  const columnCount = userRole === "Admin" ? 8 : 7; 

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case "Diluluskan":
        return "success";
      case "Ditolak":
        return "destructive";
      case "Menunggu Kelulusan":
        return "warning";
      default:
        return "outline";
    }
  };

  return (
    <div>
      <h2 className="text-base font-semibold text-foreground mb-3">
        {userRole === "Executive"
          ? "Senarai Semua Permohonan Pindaan"
          : "Senarai Permohonan Untuk Kelulusan"}
      </h2>

      {/* Bekas Penapis */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-9 w-[190px]"
          aria-label="Tapis mengikut status"
        >
          <option value="Menunggu Kelulusan">Menunggu Kelulusan</option>
          <option value="Diluluskan">Diluluskan</option>
          <option value="Ditolak">Ditolak</option>
          <option value="Semua">Semua Status</option>
        </Select>
        
        {userRole === "Admin" && (
          <Select
            value={filterSyarikat}
            onChange={(e) => setFilterSyarikat(e.target.value)}
            className="h-9 w-[210px]"
            aria-label="Tapis mengikut syarikat"
          >
            <option value="Semua">Semua Syarikat</option>
            {syarikatList.map((subs) => (
              <option key={subs.syarikat_id} value={subs.syarikat_id}>
                {subs.nama_syarikat}
              </option>
            ))}
          </Select>
        )}
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Bil.</TableHead>
              <TableHead>No Rujukan</TableHead>
              <TableHead>Risiko</TableHead> 
              <TableHead>Syarikat</TableHead> 
              {userRole === "Admin" && <TableHead>Pemohon</TableHead>}
              <TableHead>Tarikh Mohon</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Tindakan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-32">
                  <LoadingSpinner text="Memuatkan data..." size="sm" />
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-32">
                  <AlertBanner variant="error" title="Ralat" description={error} />
                </TableCell>
              </TableRow>
            ) : displayAmendments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-32">
                  <EmptyState icon={FilePenLine} title="Tiada Data" description="Tiada permohonan pindaan ditemui." />
                </TableCell>
              </TableRow>
            ) : (
              displayAmendments.map((amend, index) => (
                <TableRow key={amend.pindaan_id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-mono text-xs font-medium whitespace-nowrap">{amend.no_rujukan || "N/A"}</TableCell>
                  <TableCell className="max-w-[280px] truncate" title={amend.risiko}>{amend.risiko || "N/A"}</TableCell> 
                  <TableCell>{amend.nama_syarikat || "N/A"}</TableCell> 
                  {userRole === "Admin" && (
                    <TableCell>{amend.nama_pemohon || "N/A"}</TableCell>
                  )}
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(amend.created_at).toLocaleDateString("ms-MY")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(amend.status_permohonan)}>
                      {amend.status_permohonan}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      onClick={() => handleViewDetails(amend)}
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                    >
                      <Eye size={13} /> Lihat
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default PindaanRisiko;
