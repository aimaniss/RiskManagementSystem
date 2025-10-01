import { useState, useEffect } from "react";
import { Edit, Plus } from "lucide-react";
import "./RawatanRisiko.css";

function RawatanRisiko() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [tahunFilter, setTahunFilter] = useState("");
  const [separuhFilter, setSeparuhFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // Dummy data
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setData([
        {
          id: 1,
          no_rujukan: "RR-001",
          tahun: 2025,
          separuh: "Pertama",
          syarikat: "ABC Holdings",
          kategori: "Operasi",
          risiko: "Gangguan sistem ICT",
          skor: "Tinggi",
          plan: "Naik taraf server",
          kawalan: "Kawalan Preventif",
          tempoh: "Disember 2025",
          kakitangan: "Ali Bin Abu",
        },
        {
          id: 2,
          no_rujukan: "RR-002",
          tahun: 2025,
          separuh: "Kedua",
          syarikat: "XYZ Sdn Bhd",
          kategori: "Kewangan",
          risiko: "Kelewatan bayaran vendor",
          skor: "Sederhana",
          plan: "Automasi invois",
          kawalan: "Kawalan Detektif",
          tempoh: "Mac 2026",
          kakitangan: "Siti Aminah",
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  // Filtering
  const filteredData = data.filter((d) => {
    const matchSearch = d.no_rujukan.toLowerCase().includes(search.toLowerCase());
    const matchTahun = !tahunFilter || d.tahun === parseInt(tahunFilter);
    const matchSeparuh = !separuhFilter || d.separuh === separuhFilter;
    return matchSearch && matchTahun && matchSeparuh;
  });

  // Dummy metrics
  const risikoAktif = filteredData.length;
  const planRawatan = filteredData.filter((d) => d.plan).length;

  const handleEdit = (id) => {
    alert(`✏️ Edit Rawatan ID: ${id}`);
  };

  const handleTambah = (id) => {
    alert(`➕ Tambah Rawatan untuk ID: ${id}`);
  };

  return (
    <div className="senarai-risiko-container">
      <h1>Rawatan Risiko</h1>

      {/* Cards */}
      <div className="cards-container">
        <div className="info-card">
          <h3>Bilangan Risiko Aktif</h3>
          <p>{risikoAktif}</p>
        </div>
        <div className="info-card">
          <h3>Bilangan Plan Rawatan</h3>
          <p>{planRawatan}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-container">
        <input
          type="text"
          placeholder="Cari No Rujukan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={tahunFilter} onChange={(e) => setTahunFilter(e.target.value)}>
          <option value="">-- Semua Tahun --</option>
          {[...new Set(data.map((d) => d.tahun))]
            .sort((a, b) => b - a)
            .map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
        </select>
        <select value={separuhFilter} onChange={(e) => setSeparuhFilter(e.target.value)}>
          <option value="">-- Semua Separuh Tahun --</option>
          <option value="Pertama">Pertama</option>
          <option value="Kedua">Kedua</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="risiko-table">
          <thead>
            <tr>
              <th>Bil.</th>
              <th>No Rujukan</th>
              <th>Tahun</th>
              <th>Separuh Tahun Didaftarkan</th>
              <th>Nama Subsidiari</th>
              <th>Kategori Risiko</th>
              <th>Risiko</th>
              <th>Skor Risiko</th>
              <th>Plan Tindakan</th>
              <th>Jenis Kawalan</th>
              <th>Tempoh Jangkaan Siap Tindakan</th>
              <th>Kakitangan Bertanggungjawab</th>
              <th>Tindakan</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="13" className="loading">
                  Loading...
                </td>
              </tr>
            ) : filteredData.length > 0 ? (
              filteredData.map((d, i) => (
                <tr key={d.id}>
                  <td>{i + 1}</td>
                  <td>{d.no_rujukan}</td>
                  <td>{d.tahun}</td>
                  <td>{d.separuh}</td>
                  <td>{d.syarikat}</td>
                  <td>{d.kategori}</td>
                  <td>{d.risiko}</td>
                  <td>{d.skor}</td>
                  <td>{d.plan}</td>
                  <td>{d.kawalan}</td>
                  <td>{d.tempoh}</td>
                  <td>{d.kakitangan}</td>
                  <td className="actions">
                    <button onClick={() => handleEdit(d.id)} className="btn-edit">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleTambah(d.id)} className="btn-add">
                      <Plus size={16} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="13" className="no-data">
                  Tiada data dijumpai
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RawatanRisiko;
