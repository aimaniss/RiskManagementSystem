import { useState, useMemo, useEffect } from "react";
import { 
  FaCalendarAlt, FaUserShield, FaBuilding, FaTimes, FaEye,
  FaPlus, FaEdit, FaTrash, FaPaperPlane, FaCheckCircle, FaTimesCircle, FaExclamationCircle,
  FaFilter 
} from "react-icons/fa";

// ===================================================================
// 1. Data 'mock' 
// ===================================================================
const mockSenaraiPeranan = ["Pentadbir", "Ketua Subsidiari", "Staff"];
const mockSenaraiSubsidiari = ["Ibu Pejabat", "UKM Holdings", "UKM Pakarunding", "UKM Specialist Centre"];
const mockSenaraiAktiviti = ["Tambah", "Lulus", "Kemaskini", "Padam", "Tolak", "Permohonan"];

// ===================================================================
// 2. Fungsi Helper & 3. AktivitiTag (Kekal Sama)
// ===================================================================
const formatTarikh = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString("ms-MY", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

const getAktivitiTeks = (aktiviti) => {
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

function AktivitiTag({ aktiviti }) {
  let tagData = {
    ikon: <FaExclamationCircle />,
    teks: "Lain-lain",
    style: styles.tagGray,
  };
  const teksAktiviti = getAktivitiTeks(aktiviti);
  if (teksAktiviti === "Tambah" || teksAktiviti === "Lulus") {
    tagData = { ikon: teksAktiviti === "Tambah" ? <FaPlus /> : <FaCheckCircle />, teks: teksAktiviti, style: styles.tagGreen };
  } else if (teksAktiviti === "Kemaskini") {
    tagData = { ikon: <FaEdit />, teks: teksAktiviti, style: styles.tagBlue };
  } else if (teksAktiviti === "Padam" || teksAktiviti === "Tolak") {
    tagData = { ikon: teksAktiviti === "Padam" ? <FaTrash /> : <FaTimesCircle />, teks: teksAktiviti, style: styles.tagRed };
  } else if (teksAktiviti === "Permohonan") {
    tagData = { ikon: <FaPaperPlane />, teks: teksAktiviti, style: styles.tagOrange };
  }
  return (
    <span style={{ ...styles.tagBase, ...tagData.style }}>
      {tagData.ikon}
      <span style={{ marginLeft: '6px' }}>{tagData.teks}</span>
    </span>
  );
}

// ===================================================================
// 4. Komponen Modal (Kekal Sama)
// ===================================================================
function LogDetailModal({ log, onTutup }) {
  if (!log) return null;
  return (
    <div style={modalStyles.overlay} onClick={onTutup}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h2 style={{ margin: 0, fontSize: "20px" }}>Perincian Log Aktiviti</h2>
          <button onClick={onTutup} style={modalStyles.tutupButton}> <FaTimes /> </button>
        </div>
        <div style={modalStyles.body}>
          <div style={modalStyles.detailItem}> <strong>Pengguna:</strong> <span>{log.nama_pengguna} (ID: {log.user_id})</span> </div>
          <div style={modalStyles.detailItem}> <strong>Peranan:</strong> <span>{log.peranan_pengguna}</span> </div>
          <div style={modalStyles.detailItem}> <strong>Subsidiari:</strong> <span>{log.subsidiari}</span> </div>
          <div style={modalStyles.detailItem}> <strong>Tarikh & Masa:</strong> <span>{formatTarikh(log.tarikh_masa)}</span> </div>
          <div style={modalStyles.detailItem}> <strong>Aktiviti:</strong> <AktivitiTag aktiviti={log.aktiviti} /> </div>
          <div style={{ ...modalStyles.detailItem, flexDirection: 'column', alignItems: 'flex-start' }}>
            <strong>Perincian Penuh:</strong> <p style={modalStyles.perincianTeks}>{log.perincian}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// 5. Komponen Utama (LogAktiviti)
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
  
  // 🚀 LOGIK PENGAMBILAN DATA DARI API (DIKEMASKINI)
  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      setError(null);

        // 1. Bina Query String untuk menghantar parameter penapis
        const params = new URLSearchParams();
        if (tarikhMula) params.append('tarikhMula', tarikhMula);
        if (tarikhAkhir) params.append('tarikhAkhir', tarikhAkhir);
        if (filterPeranan) params.append('peranan', filterPeranan);
        if (filterSubsidiari) params.append('subsidiari', filterSubsidiari);
        // Kita hantar jenis teks Aktiviti (cth: "Lulus", "Tambah")
        if (filterAktiviti) params.append('aktiviti_teks', filterAktiviti); 
        
        // Gabungkan URL asas dengan parameter penapis
        const url = `/api/log_aktiviti?${params.toString()}`;
        // ⚠️ Nota: Jika anda tidak menggunakan proxy, URL perlu penuh: `http://localhost:5000/api/log_aktiviti...`

      try {
        const response = await fetch(url); 
        if (!response.ok) {
          throw new Error(`Ralat HTTP! Status: ${response.status}`);
        }
        const data = await response.json();
        
        setLogs(data); 
      } catch (err) {
        console.error("Gagal memuatkan log aktiviti:", err);
        setError("Gagal memuatkan data dari server. Sila cuba sebentar lagi.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLogs();
// 2. KEMASKINI DEPENDENCY ARRAY: Panggilan fetchlogs() setiap kali filter berubah
  }, [tarikhMula, tarikhAkhir, filterPeranan, filterSubsidiari, filterAktiviti]); 

  // Logik Penapis (DIBUANG)
// ⚠️ Logik Penapis di frontend ini kini TIDAK DIPERLUKAN lagi kerana penapisan dibuat di API
  const filteredLogs = logs; // Menggunakan data logs secara terus
// ... Logik useMemo asal telah ditukar ...

  // Fungsi Reset (Kekal Sama)
  const resetFilters = () => {
    setTarikhMula("");
    setTarikhAkhir("");
    setFilterPeranan("");
    setFilterSubsidiari("");
    setFilterAktiviti("");
  };

  // Logik Modal (Kekal Sama)
  const logDipilih = useMemo(() => {
    return logs.find(log => log.log_id === selectedLogId);
  }, [logs, selectedLogId]);


  return (
    <div style={{ padding: "20px", fontFamily: "Roboto, sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      
      {/* 5. Header */}
      <h1 style={styles.pageTitle}>
        Log Aktiviti
      </h1>

      {/* 6. Bar Penapis (Kekal Sama) */}
      <div style={styles.filterBar}>
        <div style={styles.filterGroupLeft}>
          <div style={styles.filterInputWrapper}>
            <FaFilter style={styles.filterInputIcon} />
            <select value={filterAktiviti} onChange={(e) => setFilterAktiviti(e.target.value)} style={styles.filterSelect}>
              <option value="">Semua Aktiviti</option>
              {senaraiAktiviti.map(aktiviti => (<option key={aktiviti} value={aktiviti}>{aktiviti}</option>))}
            </select>
          </div>
          <div style={styles.filterInputWrapper}>
            <FaUserShield style={styles.filterInputIcon} />
            <select value={filterPeranan} onChange={(e) => setFilterPeranan(e.target.value)} style={styles.filterSelect}>
              <option value="">Semua Peranan</option>
              {senaraiPeranan.map(peranan => (<option key={peranan} value={peranan}>{peranan}</option>))}
            </select>
          </div>
          <div style={styles.filterInputWrapper}>
            <FaBuilding style={styles.filterInputIcon} />
            <select value={filterSubsidiari} onChange={(e) => setFilterSubsidiari(e.target.value)} style={styles.filterSelect}>
              <option value="">Semua Subsidiari</option>
              {senaraiSubsidiari.map(subs => (<option key={subs} value={subs}>{subs}</option>))}
            </select>
          </div>
        </div>
        <div style={styles.filterGroupRight}>
          <div style={styles.filterInputWrapper}>
            <FaCalendarAlt style={styles.filterInputIcon} />
            <input type="date" value={tarikhMula} onChange={(e) => setTarikhMula(e.target.value)} style={styles.filterSelect} />
          </div>
          <span style={{ color: '#475569', margin: '0 4px' }}>ke</span>
          <div style={styles.filterInputWrapper}>
            <FaCalendarAlt style={styles.filterInputIcon} />
            <input type="date" value={tarikhAkhir} onChange={(e) => setTarikhAkhir(e.target.value)} style={styles.filterSelect} />
          </div>
          <button onClick={resetFilters} style={styles.resetButton}>
            Reset
          </button>
        </div>
      </div>


      {/* 7. Paparan Jadual */}
      <div style={styles.tableContainer}>
        
        {/* Paparan Loading/Error */}
        {isLoading && <div style={styles.loadingText}>Memuatkan data log aktiviti...</div>}
        {error && <div style={styles.errorText}>⚠️ Ralat: {error}</div>}
        

        {!isLoading && !error && (
          <table style={styles.table}>
            <thead style={styles.thead}>
              <tr>
                <th style={{...styles.th, width: "25%"}}>Pengguna</th>
                <th style={{...styles.th, width: "15%"}}>Aktiviti</th>
                <th style={{...styles.th, width: "35%"}}>Perincian</th>
                <th style={{...styles.th, width: "15%"}}>Tarikh & Masa</th>
                <th style={{...styles.th, width: "10%", textAlign: "center"}}>Tindakan</th>
              </tr>
            </thead>
            <tbody style={styles.tbody}>
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr 
                    key={log.log_id} 
                    style={styles.tr}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                  >
                    <td style={styles.td}>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{log.nama_pengguna}</div>
                      <div style={{ fontSize: '12px', color: '#475569' }}>{log.peranan_pengguna}</div>
                      <div style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic' }}>
                        {log.subsidiari}
                      </div>
                    </td>
                    <td style={styles.td}><AktivitiTag aktiviti={log.aktiviti} /></td>
                    <td style={{...styles.td, fontSize: '13px', color: '#334155'}}>{log.perincian}</td>
                    <td style={{...styles.td, fontSize: '13px', color: '#334155'}}>{formatTarikh(log.tarikh_masa)}</td>
                    <td style={{...styles.td, textAlign: "center"}}>
                      <button 
                        style={styles.viewButton}
                        title="Lihat Perincian"
                        onClick={() => setSelectedLogId(log.log_id)}
                      >
                        <FaEye />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr style={styles.tr}>
                  <td colSpan="5" style={styles.noLogsTd}>
                    📜 Tiada log aktiviti dijumpai yang sepadan dengan carian anda.
                  </td>
                </tr>
              )}
          </tbody>
          </table>
        )}

      </div>

      {/* 8. Paparan Modal */}
      <LogDetailModal log={logDipilih} onTutup={() => setSelectedLogId(null)} />
    </div>
  );
}

// ===================================================================
// 5. Stail (Kekal Sama)
// ===================================================================

const styles = {
  pageTitle: { fontSize: '24px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' },
  filterBar: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '8px' },
  filterGroupLeft: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' },
  filterGroupRight: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' },
  filterInputWrapper: { position: 'relative' },
  filterInputIcon: { position: 'absolute', top: '7px', left: '8px', color: '#9ca3af', fontSize: '13px' },
  filterSelect: { padding: '6px 8px 6px 28px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#ffffff', color: '#374151', appearance: 'none', minWidth: '130px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', height: '30px', boxSizing: 'border-box' },
  resetButton: { padding: '6px 12px', fontSize: '13px', fontWeight: '600', color: '#ffffff', background: '#ef4444', border: '1px solid #dc2626', borderRadius: '4px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', height: '30px', transition: 'background-color 0.2s' },
  tableContainer: { background: '#ffffff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  thead: { background: '#0074c8', color: '#ffffff' },
  th: { padding: '10px 16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', borderBottom: '1px solid #005a9e' },
  tbody: { color: '#334155' },
  tr: { borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.2s' },
  td: { padding: '10px 16px', verticalAlign: 'middle', lineHeight: '1.5' },
  viewButton: { background: 'transparent', color: '#334155', border: 'none', borderRadius: '4px', padding: '6px', cursor: 'pointer', fontSize: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  noLogsTd: { padding: '40px', textAlign: 'center', color: '#475569', fontSize: '16px' },
  tagBase: { display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
  tagGreen: { backgroundColor: '#ecfdf5', color: '#067647' },
  tagBlue: { backgroundColor: '#eff6ff', color: '#1d4ed8' },
  tagRed: { backgroundColor: '#fef2f2', color: '#b91c1c' },
  tagOrange: { backgroundColor: '#fff7ed', color: '#c2410c' },
  tagGray: { backgroundColor: '#f1f5f9', color: '#334155' },
  loadingText: { padding: '40px', textAlign: 'center', color: '#1d4ed8', fontSize: '16px', fontWeight: '600' },
  errorText: { padding: '40px', textAlign: 'center', color: '#b91c1c', fontSize: '16px', fontWeight: '600', background: '#fef2f2' },
};

const modalStyles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#ffffff', borderRadius: '8px', boxShadow: '0 8px 30px rgba(0,0,0,0.2)', width: '90%', maxWidth: '600px', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: '#1d4ed8', color: 'white' },
  tutupButton: { background: 'transparent', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer', padding: 0, lineHeight: 1 },
  body: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' },
  detailItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #e5e8f0', fontSize: '15px' },
  perincianTeks: { margin: '8px 0 0 0', background: '#f8fafc', border: '1px solid #e5e7eb', padding: '12px', borderRadius: '6px', width: '100%', lineHeight: 1.6, color: '#374151', whiteSpace: 'pre-wrap' }
};

export default LogAktiviti;