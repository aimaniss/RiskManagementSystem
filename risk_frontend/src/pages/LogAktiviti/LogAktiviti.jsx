import { useState, useMemo, useEffect, useCallback } from "react";
// ⭐️ Menggunakan 'lucide-react' untuk ikon
import { 
  Calendar, UserCog, Building, X, Eye,
  Plus, FilePenLine, Trash2, Send, CheckCircle, XCircle, AlertCircle,
  Filter 
} from "lucide-react";
// ⭐️ Mengimport fail CSS luaran
import './LogAktiviti.css'; 

// ===================================================================
// 1. Data 'mock' (Kekal Sama)
// ===================================================================
const mockSenaraiPeranan = ["Pentadbir", "Ketua Subsidiari", "Staff"];
const mockSenaraiSubsidiari = ["Ibu Pejabat", "UKM Holdings", "UKM Pakarunding", "UKM Specialist Centre"];
const mockSenaraiAktiviti = ["Tambah", "Lulus", "Kemaskini", "Padam", "Tolak", "Permohonan"];

// ===================================================================
// 2. Fungsi Helper (Kekal Sama)
// ===================================================================
const formatTarikh = (dateString) => {
  if (!dateString) {
    return "Tiada Tarikh";
  }
  const date = new Date(dateString);
  return date.toLocaleString("ms-MY", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

const getAktivitiTeks = (aktiviti) => {
  if (!aktiviti) {
    return "Lain-lain";
  }
  const aktivitiUpper = aktiviti.toUpperCase();
  if (aktivitiUpper.includes("LULUS")) return "Lulus";
  if (aktivitiUpper.includes("TAMBAH")) return "Tambah";
  if (aktivitiUpper.includes("KEMASKINI")) return "Kemaskini";
  if (aktivitiUpper.includes("TOLAK")) return "Tolak";
  if (aktivitiUpper.includes("PADAM")) return "Padam";
  if (aktivitiUpper.includes("PERMOHONAN") || aktivitiUpper.includes("PINDAAN") || aktivitiUpper.includes("MOHON")) {
    return "Permohonan";
  }
  return "Lain-lain";
};

// ===================================================================
// 3. AktivitiTag (Kekal Sama)
// ===================================================================
function AktivitiTag({ aktiviti }) {
  let tagData = {
    ikon: <AlertCircle size={14} />,
    teks: "Lain-lain",
    className: 'log-tag-gray', 
  };
  
  const teksAktiviti = getAktivitiTeks(aktiviti);
  
  if (teksAktiviti === "Tambah" || teksAktiviti === "Lulus") {
    tagData = { ikon: teksAktiviti === "Tambah" ? <Plus size={14} /> : <CheckCircle size={14} />, teks: teksAktiviti, className: 'log-tag-green' };
  } else if (teksAktiviti === "Kemaskini") {
    tagData = { ikon: <FilePenLine size={14} />, teks: teksAktiviti, className: 'log-tag-blue' };
  } else if (teksAktiviti === "Padam" || teksAktiviti === "Tolak") {
    tagData = { ikon: teksAktiviti === "Padam" ? <Trash2 size={14} /> : <XCircle size={14} />, teks: teksAktiviti, className: 'log-tag-red' };
  } else if (teksAktiviti === "Permohonan") {
    tagData = { ikon: <Send size={14} />, teks: teksAktiviti, className: 'log-tag-orange' };
  }
  
  return (
    <span className={`log-tag-base ${tagData.className}`}>
      {tagData.ikon}
      <span>{tagData.teks}</span>
    </span>
  );
}

// ===================================================================
// 4. Komponen Modal (Perincian) (⭐️ DIKEMASKINI ⭐️)
// ===================================================================
function LogDetailModal({ log, onTutup }) {
  if (!log) return null;
  return (
    <div className="log-modal-overlay" onClick={onTutup}>
      <div className="log-modal" onClick={(e) => e.stopPropagation()}>
        <div className="log-modal-header">
          <h2>Perincian Log Aktiviti</h2>
          <button onClick={onTutup} className="log-modal-tutup-button"> <X size={24} /> </button>
        </div>
        
        <div className="log-modal-body">
          <div className="log-modal-detail-item">
            <strong>Pengguna:</strong>
            {/* ⭐️ DIUBAH: ID Pengguna dibuang dari sini */}
            <span>{log.nama_pengguna}</span>
          </div>
         
          <div className="log-modal-detail-item">
            <strong>ID Staff:</strong>
            <span>{log.staff_id}</span>
          </div>
          <div className="log-modal-detail-item">
            <strong>Peranan:</strong>
            <span>{log.peranan_pengguna}</span>
          </div>
          <div className="log-modal-detail-item">
            <strong>Subsidiari:</strong>
            <span>{log.subsidiari}</span>
          </div>
          <div className="log-modal-detail-item">
            <strong>Tarikh & Masa:</strong>
            <span>{formatTarikh(log.tarikh_masa)}</span>
          </div>
          <div className="log-modal-detail-item">
            <strong>Aktiviti:</strong>
            <AktivitiTag aktiviti={log.aktiviti} />
          </div>
          
          <div className="log-modal-detail-full">
            <strong>Perincian Penuh:</strong>
            <p className="log-modal-perincian-teks">{log.perincian}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// 5. Komponen Modal (Padam Julat) (Kekal Sama)
// ===================================================================
function DeleteRangeModal({ isOpen, onClose, onDeleteSuccess }) {
  const [deleteMula, setDeleteMula] = useState("");
  const [deleteAkhir, setDeleteAkhir] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmitDelete = async () => {
    if (!deleteMula || !deleteAkhir) {
      setError("Sila pilih kedua-dua tarikh mula dan tarikh akhir.");
      return;
    }
    setError("");
    setIsDeleting(true);

    const confirmText = `Adakah anda pasti mahu memadam SEMUA log dari ${deleteMula} hingga ${deleteAkhir}? Tindakan ini tidak boleh diundur.`;
    
    if (window.confirm(confirmText)) {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Token tidak dijumpai.");

        const url = new URL("http://localhost:5000/api/log_aktiviti");
        url.searchParams.append("tarikhMula", deleteMula);
        url.searchParams.append("tarikhAkhir", deleteAkhir);

        const response = await fetch(url.toString(), {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || `Ralat HTTP: ${response.status}`);
        }

        const result = await response.json();
        alert(result.message); 
        onDeleteSuccess(); 
        onClose(); 
        
      } catch (err) {
        console.error("Gagal memadam log mengikut julat:", err);
        setError(err.response?.data?.error || err.message || "Gagal memadam log.");
      } finally {
        setIsDeleting(false);
      }
    } else {
      setIsDeleting(false); 
    }
  };

  return (
    <div className="log-delete-modal-overlay" onClick={onClose}>
      <div className="log-delete-modal" onClick={(e) => e.stopPropagation()}>
        <div className="log-delete-modal-header">
          <h3>Padam Log Mengikut Julat Tarikh</h3>
          <button onClick={onClose} className="log-modal-tutup-button"> <X size={20} /> </button>
        </div>
        <div className="log-delete-modal-body">
          <p>Pilih julat tarikh untuk memadam rekod log secara pukal. Tindakan ini adalah kekal.</p>
          
          <div className="log-delete-modal-form-group">
            <label htmlFor="deleteMula">Tarikh Mula</label>
            <input 
              type="date" 
              id="deleteMula" 
              value={deleteMula}
              onChange={(e) => setDeleteMula(e.target.value)}
              className="log-filter-select"
            />
          </div>
          
          <div className="log-delete-modal-form-group">
            <label htmlFor="deleteAkhir">Tarikh Akhir</label>
            <input 
              type="date" 
              id="deleteAkhir" 
              value={deleteAkhir}
              onChange={(e) => setDeleteAkhir(e.target.value)}
              className="log-filter-select"
            />
          </div>
          
          {error && <div className="log-delete-modal-error">{error}</div>}
        </div>
        <div className="log-delete-modal-footer">
          <button 
            className="log-delete-modal-button-cancel"
            onClick={onClose}
            disabled={isDeleting}
          >
            Batal
          </button>
          <button 
            className="log-delete-modal-button-confirm"
            onClick={handleSubmitDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Memadam..." : "Padam Log"}
          </button>
        </div>
      </div>
    </div>
  );
}


// ===================================================================
// 6. Komponen Utama (LogAktiviti) (Kekal Sama)
// ===================================================================
function LogAktiviti() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [senaraiPeranan] = useState(mockSenaraiPeranan);
  const [senaraiSubsidiari] = useState(mockSenaraiSubsidiari);
  const [senaraiAktiviti] = useState(mockSenaraiAktiviti);
  
  const [tarikhMula, setTarikhMula] = useState("");
  const [tarikhAkhir, setTarikhAkhir] = useState("");
  const [filterPeranan, setFilterPeranan] = useState("");
  const [filterSubsidiari, setFilterSubsidiari] = useState("");
  const [filterAktiviti, setFilterAktiviti] = useState("");
  
  const [selectedLogId, setSelectedLogId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false); 
  
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    const url = new URL("http://localhost:5000/api/log_aktiviti");
    if (tarikhMula) url.searchParams.append("tarikhMula", tarikhMula);
    if (tarikhAkhir) url.searchParams.append("tarikhAkhir", tarikhAkhir);
    if (filterPeranan) url.searchParams.append("peranan", filterPeranan);
    if (filterSubsidiari) url.searchParams.append("subsidiari", filterSubsidiari);
    if (filterAktiviti) url.searchParams.append("aktiviti_teks", filterAktiviti);
    
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token tidak dijumpai. Sila log masuk semula.");

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Ralat HTTP: ${response.status}`);
      }

      const data = await response.json();
      setLogs(data); 

    } catch (err) {
      console.error("Gagal memuatkan log aktiviti:", err);
      setError(err.message || "Gagal memuatkan data dari server.");
    } finally {
      setIsLoading(false);
    }
  }, [tarikhMula, tarikhAkhir, filterPeranan, filterSubsidiari, filterAktiviti]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleDeleteLog = async (logId) => {
    if (window.confirm("Adakah anda pasti mahu memadam rekod log ini? Tindakan ini tidak boleh diundur.")) {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Token tidak dijumpai.");

        const response = await fetch(`http://localhost:5000/api/log_aktiviti/${logId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || `Ralat HTTP: ${response.status}`);
        }
        
        setLogs(currentLogs => currentLogs.filter(log => log.log_id !== logId));

      } catch (err) {
        console.error("Gagal memadam log:", err);
        alert(`Gagal memadam log: ${err.message}`);
      }
    }
  };

  const resetFilters = () => {
    setTarikhMula("");
    setTarikhAkhir("");
    setFilterPeranan("");
    setFilterSubsidiari("");
    setFilterAktiviti("");
  };

  const logDipilih = useMemo(() => {
    return logs.find(log => log.log_id === selectedLogId);
  }, [logs, selectedLogId]);

  const filteredLogs = logs; 

  return (
    <div className="log-aktiviti-container">
      
      <h1 className="log-page-title">
        Log Aktiviti
      </h1>

      <div className="log-filter-bar">
         <div className="log-filter-group-left">
          <div className="log-filter-input-wrapper">
            <Filter className="log-filter-input-icon" />
            <select value={filterAktiviti} onChange={(e) => setFilterAktiviti(e.target.value)} className="log-filter-select">
              <option value="">Semua Aktiviti</option>
              {senaraiAktiviti.map(aktiviti => (<option key={aktiviti} value={aktiviti}>{aktiviti}</option>))}
            </select>
          </div>
          <div className="log-filter-input-wrapper">
            <UserCog className="log-filter-input-icon" />
            <select value={filterPeranan} onChange={(e) => setFilterPeranan(e.target.value)} className="log-filter-select">
              <option value="">Semua Peranan</option>
              {senaraiPeranan.map(peranan => (<option key={peranan} value={peranan}>{peranan}</option>))}
            </select>
          </div>
          <div className="log-filter-input-wrapper">
            <Building className="log-filter-input-icon" />
            <select value={filterSubsidiari} onChange={(e) => setFilterSubsidiari(e.target.value)} className="log-filter-select">
              <option value="">Semua Subsidiari</option>
              {senaraiSubsidiari.map(subs => (<option key={subs} value={subs}>{subs}</option>))}
            </select>
          </div>
        </div>
        <div className="log-filter-group-right">
          <div className="log-filter-input-wrapper">
            <Calendar className="log-filter-input-icon" />
            <input type="date" value={tarikhMula} onChange={(e) => setTarikhMula(e.target.value)} className="log-filter-select" />
          </div>
          <span style={{ color: '#475569', margin: '0 4px' }}>ke</span>
          <div className="log-filter-input-wrapper">
            <Calendar className="log-filter-input-icon" />
            <input type="date" value={tarikhAkhir} onChange={(e) => setTarikhAkhir(e.target.value)} className="log-filter-select" />
          </div>
          <button onClick={resetFilters} className="log-reset-button">
            Reset
          </button>
          <button 
            onClick={() => setIsDeleteModalOpen(true)} 
            className="log-delete-range-button"
          >
            <Trash2 size={13} /> <span>Padam Julat</span>
          </button>
        </div>
      </div>

      <div className="log-table-container">
        
        {isLoading && <div className="log-loading-text">Memuatkan data log aktiviti...</div>}
        {error && <div className="log-error-text">⚠️ Ralat: {error}</div>}
        
        {!isLoading && !error && (
          <table className="log-table">
            <thead className="log-thead">
              <tr>
                <th className="log-th" style={{width: "25%"}}>Pengguna</th>
                <th className="log-th" style={{width: "15%"}}>Aktiviti</th>
                <th className="log-th" style={{width: "35%"}}>Ringkasan</th>
                <th className="log-th" style={{width: "15%"}}>Tarikh & Masa</th>
                <th className="log-th" style={{width: "10%", textAlign: "center"}}>Tindakan</th>
              </tr>
            </thead>
            <tbody className="log-tbody">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr 
                    key={log.log_id} 
                    className="log-tr"
                  >
                    <td className="log-td">
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{log.nama_pengguna}</div>
                      <div style={{ fontSize: '12px', color: '#475569' }}>{log.peranan_pengguna}</div>
                      <div style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic' }}>
                        {log.subsidiari}
                      </div>
                    </td>
                    <td className="log-td"><AktivitiTag aktiviti={log.aktiviti} /></td>
                    <td className="log-td log-td-small-text">{log.ringkasan}</td>
                    <td className="log-td log-td-small-text">{formatTarikh(log.tarikh_masa)}</td>
                    <td className="log-td log-td-center">
                      <div className="log-action-buttons">
                        <button 
                          className="log-view-button"
                          title="Lihat Perincian"
                          onClick={() => setSelectedLogId(log.log_id)}
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          className="log-delete-button"
                          title="Padam Log"
                          onClick={() => handleDeleteLog(log.log_id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="log-tr">
                  <td colSpan="5" className="log-no-logs-td">
                    📜 Tiada log aktiviti dijumpai yang sepadan dengan carian anda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <LogDetailModal log={logDipilih} onTutup={() => setSelectedLogId(null)} />
      <DeleteRangeModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDeleteSuccess={fetchLogs} 
      />
    </div>
  );
}

export default LogAktiviti;