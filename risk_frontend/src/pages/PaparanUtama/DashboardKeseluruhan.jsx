import React from "react";
import "./DashboardKeseluruhan.css";

const DUMMY_DATA = {
  dataKuantitatif: [
    { label: "Sangat Tinggi", icon: "🔴", q4: 82, current: 112, change: "▲" },
    { label: "Tinggi (T)", icon: "🟠", q4: 0, current: 2, change: "▲" },
    { label: "Sederhana (S)", icon: "🟡", q4: 7, current: 8, change: "▲" },
    { label: "Rendah (R)", icon: "🟢", q4: 15, current: 12, change: "▼" },
    { label: "Tiada Skala Risiko", icon: "❌", q4: 31, current: 35, change: "▲" },
    { label: "Tamat Risiko", icon: "☑️", q4: 29, current: 55, change: "▲" },
  ],
  dataJenisKawalan: { kurang: 65, terima: 27 },
  dataKategoriRisiko: [
    {
      subsidiari: "UKM DAGANG (UKMD)",
      values: [1, 7, 1, 1],
      total: 10,
      colors: ["#f8b195", "#f67280", "#c06c84", "#6c5b7b"],
    },
    {
      subsidiari: "UKM REAL ESTATE",
      values: [3, 9, 6, 2],
      total: 20,
      colors: ["#f8b195", "#f67280", "#c06c84", "#6c5b7b"],
    },
  ],
  dataStatusPemantauan: { buka: 31, sedangDilaksanakan: 27, tutup: 27 },
};

export default function DashboardKeseluruhan({
  filterValues = { subsidiari: "Semua", tahunAsas: 2025, separuhAsas: "H1" },
}) {
  const { tahunAsas, separuhAsas } = filterValues;
  const baseYear = tahunAsas;
  const prevYear = tahunAsas - 1;
  const halfText = separuhAsas === "H1" ? "JAN-JUN" : "JUL-DIS";

  const totalJenisKawalan =
    DUMMY_DATA.dataJenisKawalan.kurang + DUMMY_DATA.dataJenisKawalan.terima;
  const terimaPercent = (
    (DUMMY_DATA.dataJenisKawalan.terima / totalJenisKawalan) *
    100
  ).toFixed(0);

  const totalStatusPemantauan =
    DUMMY_DATA.dataStatusPemantauan.buka +
    DUMMY_DATA.dataStatusPemantauan.sedangDilaksanakan +
    DUMMY_DATA.dataStatusPemantauan.tutup;
  const percentBuka = (
    (DUMMY_DATA.dataStatusPemantauan.buka / totalStatusPemantauan) *
    100
  ).toFixed(0);
  const percentSedang = (
    (DUMMY_DATA.dataStatusPemantauan.sedangDilaksanakan /
      totalStatusPemantauan) *
    100
  ).toFixed(0);

  return (
    <div className="dashboard-keseluruhan-layout">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left-image">
          <div className="image-placeholder">
            <span className="img-icon">🖼️</span>
          </div>
          <div className="image-caption">Unit Pematuhan & Pengurusan Risiko</div>
        </div>
        <div className="header-right-title">
          <div className="comparison-title">Perbandingan Separuh Tahun Pertama</div>
          <div className="comparison-years">
            H1 {baseYear} <span className="vs">vs</span> H1 {baseYear + 1}
          </div>
        </div>
      </div>

      {/* GRID 2 COLUMN */}
      <div className="dashboard-grid">
        {/* Kiri */}
        <div className="dashboard-left-column">
          <div className="section-box section-kuantitatif">
            <h4 className="section-title-normal">SUKATAN RISIKO SEMASA</h4>
            <div className="section-a-header">
              <p>SUKUAN KEDUA - KEEMPAT {prevYear} (APR - DIS)</p>
              <p>PENILAIAN RISIKO</p>
              <p>SEPARUH TAHUN {baseYear} ({halfText})</p>
            </div>
            <div className="section-a-table">
              {DUMMY_DATA.dataKuantitatif.map((item, i) => (
                <div className="a-row" key={i}>
                  <div className="a-cell a-symbol">
                    <span className="icon-simbol">{item.icon}</span>
                    {item.label}
                  </div>
                  <div className="a-cell q4">{item.q4}</div>
                  <div
                    className="a-cell a-change"
                    style={{
                      color: item.change === "▲" ? "#28a745" : "#dc3545",
                    }}
                  >
                    {item.change}
                  </div>
                  <div className="a-cell current">{item.current}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="section-box section-pemantauan">
            <h4 className="section-title-normal">PEMANTAPAN RISIKO</h4>
            <p className="g-subtitle">Perbandingan Risiko ({prevYear} vs {baseYear})</p>
            <div className="g-chart-container">
              <div className="chart-bar-placeholder">
                Carta Bar Bertindan Risiko ({prevYear} vs {baseYear})
              </div>
              <div className="g-legend-bottom">
                Legenda: Q2-Q4 (Biru), JAN-JUN {baseYear} (Merah)
              </div>
            </div>

            <div className="g-bottom-section">
              <div className="g-skor-risiko">
                <h5>SKOR RISIKO</h5>
                <div className="skor-data">
                  <div>R</div>
                  <div>S</div>
                  <div>T</div>
                  <div>ST</div>
                  <div>TIADA SKOR</div>
                </div>
              </div>

              <div className="g-kategori-risiko">
                <h5>KATEGORI RISIKO</h5>
                <div className="kategori-data">
                  <div>KEWANGAN</div>
                  <div>OPERASI</div>
                  <div>PEMATUHAN</div>
                  <div>STRATEGIK</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Kanan */}
        <div className="dashboard-right-column">
          <div className="dashboard-top-right-row">
            <div className="section-box section-jenis-kawalan">
              <h4 className="section-title-normal">JENIS KAWALAN</h4>
              <div className="chart-pie-container">
                <div
                  className="chart-pie-ring"
                  style={{
                    background: `conic-gradient(#ff8c00 0% ${terimaPercent}%, #7f8c8d 0% 100%)`,
                  }}
                ></div>
              </div>
              <div className="b-legend-row">
                <span className="legend-item kurang">
                  Kurang ({DUMMY_DATA.dataJenisKawalan.kurang})
                </span>
                <span className="legend-item terima">
                  Terima ({DUMMY_DATA.dataJenisKawalan.terima})
                </span>
              </div>
            </div>

            <div className="section-box section-kategori-risiko-jadual">
              <h4 className="section-title-normal">KATEGORI RISIKO (JADUAL)</h4>
              <div className="f-table-container">
                {DUMMY_DATA.dataKategoriRisiko.map((item, i) => (
                  <div key={i} className="f-row">
                    <span className="f-label">{item.subsidiari}</span>
                    <div className="f-bar-wrapper">
                      {item.values.map((v, j) => (
                        <div
                          key={j}
                          className="f-bar-segment"
                          style={{
                            width: `${(v / item.total) * 100}%`,
                            backgroundColor: item.colors[j],
                          }}
                        >
                          {v > 0 && v}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="dashboard-bottom-right-row">
            <div className="section-box section-status-pemantauan-pai">
              <h4 className="section-title-normal">STATUS PEMANTAUAN</h4>
              <div className="chart-pie-container">
                <div
                  className="chart-pie-ring"
                  style={{
                    background: `conic-gradient(
                      #dc3545 0% ${percentBuka}%,
                      #ffc107 ${percentBuka}% ${parseFloat(percentBuka) + parseFloat(percentSedang)}%,
                      #28a745 0% 100%
                    )`,
                  }}
                ></div>
              </div>
              <div className="d-legend-row">
                <span className="legend-item buka">Buka ({DUMMY_DATA.dataStatusPemantauan.buka})</span>
                <span className="legend-item sedang">Sedang ({DUMMY_DATA.dataStatusPemantauan.sedangDilaksanakan})</span>
                <span className="legend-item tutup">Tutup ({DUMMY_DATA.dataStatusPemantauan.tutup})</span>
              </div>
            </div>

            <div className="section-box section-bar-status-pemantauan">
              <h4 className="section-title-normal">STATUS PEMANTAUAN SUBSIDIARI</h4>
              <div className="chart-placeholder-large">
                Carta Bar Mendatar (Subsidiari vs Pemantauan)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
