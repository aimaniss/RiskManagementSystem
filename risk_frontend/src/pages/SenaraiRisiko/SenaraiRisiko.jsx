import { useState, useMemo } from "react";
import { Trash2, Search, Eye, X, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { getAuthUser } from "../../utils/auth";
import { getRiskAbbreviation, getRiskColor } from "../../constants/riskMatrix";
import { formatSeparuhTahun } from "../../utils/formatters";
import { useRisks } from "../../hooks/useRisks";
import { useSyarikats } from "../../hooks/useSyarikats";
import api from "../../api/api";
import ViewRisikoModal from "./ViewRisikoModal";
import "./SenaraiRisiko.css";

function sortRisks(risks, sortKey, sortDir) {
  if (!sortKey) return risks;
  return [...risks].sort((a, b) => {
    let va = a[sortKey] ?? "";
    let vb = b[sortKey] ?? "";
    if (sortKey === "semasa_skor_kebarangkalian" || sortKey === "semasa_skor_impak" || sortKey === "skor_kebarangkalian" || sortKey === "skor_impak") {
      va = parseInt(va) || 0;
      vb = parseInt(vb) || 0;
    }
    if (typeof va === "string") va = va.toLowerCase();
    if (typeof vb === "string") vb = vb.toLowerCase();
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });
}

function RiskLevelBadge({ level }) {
  const color = getRiskColor(level);
  const abbr = getRiskAbbreviation(level);
  if (!level || !abbr) return <span>-</span>;

  const colorMap = {
    "#22c55e": { bg: "#d1fae5", text: "#065f46", border: "#a7f3d0" },
    "#eab308": { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
    "#f97316": { bg: "#ffedd5", text: "#9a3412", border: "#fed7aa" },
    "#ef4444": { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" },
  };
  const c = colorMap[color] || { bg: "#f1f5f9", text: "#334155", border: "#e2e8f0" };

  return (
    <span className="rl-badge" style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }}>
      {abbr}
    </span>
  );
}

function SenaraiRisiko({ refreshTrigger }) {
  const { risks, loading, refetch } = useRisks();
  const { syarikatList } = useSyarikats();
  const [search, setSearch] = useState("");
  const [syarikatFilter, setSyarikatFilter] = useState("");
  const [tahunFilter, setTahunFilter] = useState("");
  const [separuhFilter, setSeparuhFilter] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState("no_rujukan");
  const [sortDir, setSortDir] = useState("asc");

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [riskToView, setRiskToView] = useState(null);

  const authUser = getAuthUser();
  const userRole = authUser?.role || "";
  const userSyarikatId = authUser?.syarikatId || "";
  const isRestricted = ["STAFF", "KETUA SUBSIDIARI"].includes(userRole);

  const filteredRisks = useMemo(() => risks.filter(r => {
    const matchSearch = !search ||
      (r.no_rujukan || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.risiko || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.syarikat || "").toLowerCase().includes(search.toLowerCase());
    const matchSyarikat = isRestricted
      ? r.syarikat_id === userSyarikatId
      : !syarikatFilter || r.syarikat_id === parseInt(syarikatFilter);
    const matchTahun = !tahunFilter || r.tahun === parseInt(tahunFilter);
    const matchSeparuh = !separuhFilter || r.separuh_tahun === parseInt(separuhFilter);
    const matchKategori = !kategoriFilter || r.kategori === kategoriFilter;
    const matchStatus = !statusFilter || r.status_pemantauan === statusFilter;
    return matchSearch && matchSyarikat && matchTahun && matchSeparuh && matchKategori && matchStatus;
  }), [risks, search, syarikatFilter, tahunFilter, separuhFilter, kategoriFilter, statusFilter, isRestricted, userSyarikatId]);

  const sortedRisks = useMemo(() => sortRisks(filteredRisks, sortKey, sortDir), [filteredRisks, sortKey, sortDir]);

  const stats = useMemo(() => {
    const total = risks.length;
    const displayed = filteredRisks.length;
    const byLevel = { "Rendah": 0, "Sederhana": 0, "Tinggi": 0, "Sangat Tinggi": 0 };
    filteredRisks.forEach(r => {
      const level = r.tahap_risiko_semasa && r.tahap_risiko_semasa !== "Tiada Data" ? r.tahap_risiko_semasa : r.tahap_risiko;
      if (level && byLevel[level] !== undefined) byLevel[level]++;
    });
    return { total, displayed, byLevel };
  }, [risks, filteredRisks]);

  const handleDelete = async id => {
    if (!window.confirm("Adakah anda pasti mahu padam risiko ini?")) return;
    try { await api.delete(`/risiko/${id}`); refetch(); }
    catch (err) { console.error(err); alert("Gagal padam risiko."); }
  };

  const handleViewRisk = (risk) => { setRiskToView(risk); setIsViewModalOpen(true); };
  const handleCloseViewModal = (shouldRefresh = false) => {
    setIsViewModalOpen(false);
    setRiskToView(null);
    if (shouldRefresh) refetch();
  };

  const clearFilters = () => {
    setSearch("");
    setSyarikatFilter("");
    setTahunFilter("");
    setSeparuhFilter("");
    setKategoriFilter("");
    setStatusFilter("");
  };

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const activeFilterCount = [syarikatFilter, tahunFilter, separuhFilter, kategoriFilter, statusFilter].filter(Boolean).length;
  const hasFilters = activeFilterCount > 0 || !!search;
  const uniqueYears = [...new Set(risks.map(r => r.tahun).filter(Boolean))].sort((a, b) => b - a);
  const uniqueKategori = [...new Set(risks.map(r => r.kategori).filter(Boolean))].sort();
  const uniqueStatuses = [...new Set(risks.map(r => r.status_pemantauan).filter(Boolean))].sort();

  return (
    <div className="senarai-container">
      <h2>Senarai Risiko</h2>

      <div className="senarai-toolbar">
        <div className="senarai-search">
          <Search size={15} className="senarai-search-icon" />
          <input
            className="senarai-search-input"
            placeholder="Cari no rujukan, risiko, syarikat..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="senarai-search-clear" onClick={() => setSearch("")}>
              <X size={14} />
            </button>
          )}
        </div>
        <button
          className={`senarai-filter-btn ${showFilters ? "active" : ""}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={14} />
          Tapisan
          {hasFilters && <span className="senarai-filter-count">{activeFilterCount || 1}</span>}
        </button>
      </div>

      {showFilters && (
        <div className="senarai-filter-panel">
          <div className="senarai-filter-grid">
            <div className="senarai-filter-item">
              <label>Syarikat</label>
              <select
                value={isRestricted ? userSyarikatId : syarikatFilter}
                onChange={e => setSyarikatFilter(e.target.value)}
                disabled={isRestricted}
              >
                <option value="">Semua Syarikat</option>
                {syarikatList.map(s => (
                  <option key={s.syarikat_id} value={s.syarikat_id}>{s.nama_syarikat}</option>
                ))}
              </select>
            </div>
            <div className="senarai-filter-item">
              <label>Tahun</label>
              <select value={tahunFilter} onChange={e => setTahunFilter(e.target.value)}>
                <option value="">Semua Tahun</option>
                {uniqueYears.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="senarai-filter-item">
              <label>Term</label>
              <select value={separuhFilter} onChange={e => setSeparuhFilter(e.target.value)}>
                <option value="">Semua Term</option>
                <option value="1">Pertama (T1)</option>
                <option value="2">Kedua (T2)</option>
              </select>
            </div>
            <div className="senarai-filter-item">
              <label>Kategori</label>
              <select value={kategoriFilter} onChange={e => setKategoriFilter(e.target.value)}>
                <option value="">Semua Kategori</option>
                {uniqueKategori.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className="senarai-filter-item">
              <label>Status</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">Semua Status</option>
                {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {hasFilters && (
              <button className="senarai-clear-btn" onClick={clearFilters}>
                <X size={13} /> Set Semula
              </button>
            )}
          </div>
        </div>
      )}

      <div className="senarai-stats-row">
        <span className="senarai-stat">Jumlah: <strong>{stats.displayed}</strong>{stats.displayed !== stats.total ? ` / ${stats.total}` : ""}</span>
        <span className="senarai-stat senarai-stat-r">Rendah: <strong>{stats.byLevel["Rendah"]}</strong></span>
        <span className="senarai-stat senarai-stat-s">Sederhana: <strong>{stats.byLevel["Sederhana"]}</strong></span>
        <span className="senarai-stat senarai-stat-t">Tinggi: <strong>{stats.byLevel["Tinggi"]}</strong></span>
        <span className="senarai-stat senarai-stat-st">Sangat Tinggi: <strong>{stats.byLevel["Sangat Tinggi"]}</strong></span>
      </div>

      {loading ? (
        <div className="senarai-loading">
          <div className="senarai-spinner" />
          <span>Memuat data risiko...</span>
        </div>
      ) : sortedRisks.length === 0 ? (
        <div className="senarai-empty">
          <span>Tiada data risiko ditemui.</span>
          {hasFilters && (
            <button className="senarai-clear-btn" onClick={clearFilters}>
              <X size={13} /> Set Semula Tapisan
            </button>
          )}
        </div>
      ) : (
        <div className="box">
          <div style={{ overflowX: "auto" }}>
            <table className="custom-table">
              <thead>
                <tr>
                  {[
                    { key: "no_rujukan", label: "No. Rujukan" },
                    { key: "risiko", label: "Penerangan Risiko" },
                    { key: "syarikat", label: "Syarikat" },
                    { key: "kategori", label: "Kategori" },
                    { key: "semasa_skor_kebarangkalian", label: "K" },
                    { key: "semasa_skor_impak", label: "I" },
                    { key: "tahap_risiko", label: "Tahap Risiko" },
                    { key: "status_risiko", label: "Status" },
                    { key: "tahun", label: "Sesi" },
                  ].map(col => (
                    <th key={col.key} onClick={() => handleSort(col.key)} style={{ cursor: "pointer" }}>
                      {col.label}
                      {sortKey === col.key && (
                        sortDir === "asc" ? <ChevronUp size={13} style={{ marginLeft: 4 }} /> : <ChevronDown size={13} style={{ marginLeft: 4 }} />
                      )}
                    </th>
                  ))}
                  <th style={{ width: 80, textAlign: "center" }}>Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {sortedRisks.map((risk) => (
                  <tr key={risk.id} onClick={() => handleViewRisk(risk)}>
                    <td className="senarai-td-ref">{risk.no_rujukan || "-"}</td>
                    <td className="senarai-td-desc">{risk.risiko || "-"}</td>
                    <td>{risk.singkatan_syarikat || risk.syarikat || "-"}</td>
                    <td>{risk.kategori || "-"}</td>
                    <td style={{ textAlign: "center", fontWeight: 600 }}>{risk.semasa_skor_kebarangkalian || risk.skor_kebarangkalian || "-"}</td>
                    <td style={{ textAlign: "center", fontWeight: 600 }}>{risk.semasa_skor_impak || risk.skor_impak || "-"}</td>
                    <td><RiskLevelBadge level={risk.tahap_risiko_semasa && risk.tahap_risiko_semasa !== "Tiada Data" ? risk.tahap_risiko_semasa : risk.tahap_risiko} /></td>
                    <td>
                      {(() => {
                        const latestLevel = risk.tahap_risiko_semasa && risk.tahap_risiko_semasa !== "Tiada Data" ? risk.tahap_risiko_semasa : risk.tahap_risiko;
                        const status = latestLevel && latestLevel !== "Rendah" && latestLevel !== "Tiada Data" ? "Ya" : "Tidak";
                        return (
                          <span className={`senarai-status ${status === "Ya" ? "senarai-status-ya" : "senarai-status-tidak"}`}>
                            {status}
                          </span>
                        );
                      })()}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {risk.tahun || "-"}{risk.separuh_tahun ? ` / ${formatSeparuhTahun(risk.separuh_tahun)}` : ""}
                    </td>
                    <td style={{ textAlign: "center" }} onClick={e => e.stopPropagation()}>
                      <div className="senarai-actions">
                        <button className="senarai-action-btn" onClick={() => handleViewRisk(risk)} title="Lihat">
                          <Eye size={15} />
                        </button>
                        <button className="senarai-action-btn senarai-action-delete" onClick={() => handleDelete(risk.id)} title="Padam">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isViewModalOpen && (
        <ViewRisikoModal isOpen={isViewModalOpen} risk={riskToView} userRole={userRole} onClose={handleCloseViewModal} />
      )}
    </div>
  );
}

export default SenaraiRisiko;
