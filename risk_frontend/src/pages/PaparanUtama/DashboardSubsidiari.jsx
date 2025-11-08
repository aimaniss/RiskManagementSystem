import { useState } from "react";
import "./DashboardSubsidiari.css";

export default function DashboardSubsidiari() {
  // Data dummy dikemaskini untuk sepadan dengan gambar
  const allData = [
    {
      tahun: "2024",
      noRujukan: "UKMSC/0723/01",
      bahagian: "SUMBER MANUSIA",
      kategori: "STRATEGIK",
      status: "Sedang Dilaksanakan",
      skorPenilaian: "T",
      jenisKawalan: "Kurang",
      pelanTindakan:
        "Implement Employee Retention Strategies\n1. Competitive Salary\n2. Recognize & Reward Employees\n3. Build Employee Engagement\n4. Reduce Employee Burnout\n5. Employee Wellness (Physical/Mental)\n6. Personal Development (Career Growth)",
      skorPemantauan: "S",
      kakitanganBw: "Ketua Sumber Manusia UKMSC/JKMH", // Data baru
      pelanTindakanPemantauan:
        "1. Kesejahteraan Kakitangan (Fizikal/Mental)\n- UKMSC akan mengadakan bengkel yang dijadualkan pada bulan Julai 2025\n2. Memperbesarkan Talent Pool dengan kerjasama kolej atau universiti tempatan", // Data baru
    },
    {
      tahun: "2025",
      noRujukan: "UKMSC/0724/02",
      bahagian: "KEWANGAN",
      kategori: "OPERASI",
      status: "Tutup",
      skorPenilaian: "S",
      jenisKawalan: "Terima",
      pelanTindakan: "1. Audit Internal\n2. Pemantauan vendor",
      skorPemantauan: "S",
      kakitanganBw: "Ketua Pegawai Kewangan", // Data tambahan
      pelanTindakanPemantauan: "1. Semakan audit suku tahunan", // Data tambahan
    },
    {
      tahun: "2025",
      noRujukan: "UKMSC/0724/03",
      bahagian: "SUMBER MANUSIA",
      kategori: "STRATEGIK",
      status: "Sedang Dilaksanakan",
      skorPenilaian: "T",
      jenisKawalan: "Kurang",
      pelanTindakan: "1. Kursus Latihan",
      skorPemantauan: "S",
      kakitanganBw: "Ketua Sumber Manusia UKMSC/JKMH", // Data tambahan
      pelanTindakanPemantauan: "1. Modul latihan baru dibangunkan", // Data tambahan
    },
  ];

  const [tahunFokus, setTahunFokus] = useState("2024");
  const [selectedNoRujukan, setSelectedNoRujukan] = useState("UKMSC/0723/01"); // Set default untuk tunjuk data

  const dataTahun = allData.filter((item) => item.tahun === tahunFokus);
  const selectedData = dataTahun.find(
    (item) => item.noRujukan === selectedNoRujukan
  );

  return (
    <div className="dashboard-subsidiari">
      {/* Pilih Tahun */}
      <div className="tahun-toggle">
        <button
          className={tahunFokus === "2024" ? "active" : ""}
          onClick={() => {
            setTahunFokus("2024");
            setSelectedNoRujukan("");
          }}
        >
          2024
        </button>
        <button
          className={tahunFokus === "2025" ? "active" : ""}
          onClick={() => {
            setTahunFokus("2025");
            setSelectedNoRujukan("");
          }}
        >
          2025
        </button>
      </div>

      {/* Perincian */}
      <div className="perincian-section">
        <h3>Perincian Risiko ({tahunFokus})</h3>
        <div className="no-rujukan-select">
          <label>Pilih No Rujukan:</label>
          <select
            value={selectedNoRujukan}
            onChange={(e) => setSelectedNoRujukan(e.target.value)}
          >
            <option value="">-- Pilih No Rujukan --</option>
            {dataTahun.map((item) => (
              <option key={item.noRujukan} value={item.noRujukan}>
                {item.noRujukan}
              </option>
            ))}
          </select>
        </div>

        {selectedData ? (
          <div className="perincian-table-container">
            <table className="perincian-table">
              <thead>
                <tr>
                  <th className="header-perincian" colSpan="3">
                    PERINCIAN:
                  </th>
                  <th className="header-norujukan" colSpan="2">
                    {selectedData.noRujukan}
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Bahagian Info Atas */}
                <tr>
                  <td className="col-label">
                    <strong>BAHAGIAN/UNIT</strong>
                  </td>
                  <td className="col-data">{selectedData.bahagian}</td>
                  <td className="col-kakitangan-label" rowSpan="3">
                    <strong>KAKITANGAN BERTANGGUNGJAWAB</strong>
                  </td>
                  <td className="col-kakitangan-data" rowSpan="3" colSpan="2">
                    {selectedData.kakitanganBw}
                  </td>
                </tr>
                <tr>
                  <td className="col-label">
                    <strong>KATEGORI RISIKO</strong>
                  </td>
                  <td className="col-data">{selectedData.kategori}</td>
                </tr>
                <tr>
                  <td className="col-label">
                    <strong>STATUS PEMANTAUAN</strong>
                  </td>
                  <td className="col-data">{selectedData.status}</td>
                </tr>

                {/* Pemisah */}
                <tr>
                  <td className="divider" colSpan="5"></td>
                </tr>

                {/* Bahagian Header Jadual Bawah */}
                <tr className="header-row">
                  <th>SKOR PENILAIAN RISIKO</th>
                  <th>PELAN TINDAKAN [Rawatan Risiko]</th>
                  <th>JENIS KAWALAN</th>
                  <th>PELAN TINDAKAN [Pemantauan 2025]</th>
                  <th>SKOR PEMANTAUAN RISIKO 2025</th>
                </tr>

                {/* Bahagian Data Jadual Bawah */}
                <tr className="data-row">
                  <td className="col-skor col-skor-penilaian">
                    {selectedData.skorPenilaian}
                  </td>
                  <td>
                    <pre>{selectedData.pelanTindakan}</pre>
                  </td>
                  <td>{selectedData.jenisKawalan}</td>
                  <td>
                    <pre>{selectedData.pelanTindakanPemantauan}</pre>
                  </td>
                  <td className="col-skor col-skor-pemantauan">
                    {selectedData.skorPemantauan}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-note">
            Sila pilih No Rujukan untuk lihat maklumat.
          </p>
        )}
      </div>
    </div>
  );
}