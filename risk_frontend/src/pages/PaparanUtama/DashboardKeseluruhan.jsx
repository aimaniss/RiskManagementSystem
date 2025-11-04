import React from "react";
import "./DashboardKeseluruhan.css";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from "recharts";

// =======================================================
// ===== FUNGSI HELPER RECHARTS (Utility) =====
// =======================================================
// Fungsi ini dikekalkan kerana ia adalah sebahagian daripada logik paparan

/** Memaparkan label % di dalam carta pai */
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload }) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (payload.value === 0) return null;

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="12px" fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

/** Memaparkan label nilai di dalam carta bar bertindan */
const renderStackedBarLabel = (props) => {
  const { x, y, width, height, value } = props;
  if (value === 0) return null;
  
  return (
    <text x={x + width / 2} y={y + height / 2} fill="#fff" textAnchor="middle" dy={".3em"} fontSize="10px">
      {value}
    </text>
  );
};

// =======================================================
// ===== KOMPONEN-KOMPONEN KECIL (Helper Components) =====
// =======================================================
// Komponen-komponen ini juga bersih dan hanya menerima props

/** 1. Komponen Lagenda Skor Risiko */
function SkorRisikoLegend({ legendData }) {
  return (
    <div className="g-bottom-section">
      <div className="g-skor-risiko">
        <h5>SKOR RISIKO</h5>
        <div className="skor-risiko-legend-container">
          {legendData.map((item) => (
            <div key={item.short} className="skor-risiko-item">
              <span
                className="skor-risiko-box"
                style={{ backgroundColor: item.color }}
              >
                {item.short}
              </span>
              <span className="skor-risiko-label">{item.long}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** 2. Komponen Carta Pai Berbanding (Reusable) */
function CartaPaiBandingan({ title, dataPrev, dataCurrent, colors, prevYear, baseYear, renderLegend }) {
  return (
    <div className="section-box">
      <h4 className="section-title-normal">{title}</h4>
      <div className="pie-comparison-wrapper">
        {[{ data: dataPrev, year: prevYear, period: 'prev' }, 
          { data: dataCurrent, year: baseYear, period: 'current' }].map(item => (
          <div className="pie-chart-container" key={item.period}>
            <h5 className="pie-chart-title">H1 {item.year}</h5>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={item.data}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  dataKey="value"
                  labelLine={false}
                  label={renderCustomizedLabel}
                >
                  {item.data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {renderLegend(item.period)}
          </div>
        ))}
      </div>
    </div>
  );
}

/** 3. Komponen Carta Bar Bertindan Berbanding (Reusable) */
function CartaBarBertindanBandingan({ title, dataPrev, dataCurrent, legendMap, prevYear, baseYear, yAxisKey = "subsidiari", height = 100 }) {
  return (
    <div className="section-box">
      <h4 className="section-title-normal">{title}</h4>
      <div className="f-table-container">
        {[{ data: dataPrev, year: prevYear }, 
          { data: dataCurrent, year: baseYear }].map(item => (
          <div key={item.year}>
            <span className="comparison-bar-label" style={item.year === baseYear ? {marginTop: '10px'} : {}}>
              H1 {item.year}
            </span>
            <ResponsiveContainer width="100%" height={height}>
              <BarChart data={item.data} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey={yAxisKey} axisLine={false} tickLine={false} width={100} />
                <Tooltip />
                {legendMap.map((entry) => (
                  <Bar key={entry.label} dataKey={entry.label} stackId="a" fill={entry.color} isAnimationActive={false}>
                    <LabelList dataKey={entry.label} content={renderStackedBarLabel} />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
      <div className="f-legend-container">
        {legendMap.map((item, i) => (
          <div key={i} className="f-legend-item">
            <span
              className="f-legend-color-box"
              style={{ backgroundColor: item.color }}
            ></span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 4. Komponen Carta Bar Berkelompok (Reusable) */
function CartaBarBerkelompok({ title, subtitle, data, barKeys, skorRisikoLegendData }) {
  return (
    <div className="section-box section-pemantauan">
      <h4 className="section-title-normal">{title}</h4>
      <p className="g-subtitle">{subtitle}</p>
      <div className="pemantapan-chart-container">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '10px' }} />
            {barKeys.map(keyInfo => (
              <Bar key={keyInfo.label} dataKey={keyInfo.label} fill={keyInfo.color}>
                <LabelList 
                  dataKey={keyInfo.label} 
                  position="top" 
                  fontSize="10px" 
                  formatter={(val) => val > 0 ? val : ''} 
                />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <SkorRisikoLegend legendData={skorRisikoLegendData} />
    </div>
  );
}


// =======================================================
// ===== KOMPONEN UTAMA (Main Component) =====
// =======================================================

export default function DashboardKeseluruhan({
  filterValues = { subsidiari: "Semua", tahunAsas: 2025, separuhAsas: "H1" },
  // SEMUA DATA KINI DIHANTAR MELALUI PROP 'dashboardData'
  dashboardData = {} 
}) {
  const { tahunAsas } = filterValues;
  const baseYear = tahunAsas;
  const prevYear = tahunAsas - 1;

  // --- Ambil data yang telah diproses dari props ---
  const {
    pieDataJenisKawalan,
    dataJenisKawalanRaw, // Data mentah untuk lagenda
    pieDataStatusPemantauan,
    dataStatusPemantauanRaw, // Data mentah untuk lagenda
    stackedBarKategoriRisiko,
    kategoriRisikoLegend,
    barDataPemantapan,
    barKeysPemantapan,
    skorRisikoLegendData,
    stackedBarStatusSubsidiari,
    legendMapStatusSubsidiari,
    colorsJenisKawalan,
    colorsStatusPemantauan
  } = dashboardData;

  // --- Fungsi untuk memaparkan lagenda (kini bergantung pada data props) ---

  const renderLegendJenisKawalan = (period) => (
    <div className="b-legend-row">
      <span className="legend-item kurang">
        Kurang ({dataJenisKawalanRaw?.[period]?.kurang || 0})
      </span>
      <span className="legend-item terima">
        Terima ({dataJenisKawalanRaw?.[period]?.terima || 0})
      </span>
    </div>
  );
  
  const renderLegendStatusPemantauan = (period) => (
    <div className="d-legend-row">
      <span className="legend-item buka">Buka ({dataStatusPemantauanRaw?.[period]?.buka || 0})</span>
      <span className="legend-item sedang">Sedang ({dataStatusPemantauanRaw?.[period]?.sedangDilaksanakan || 0})</span>
      <span className="legend-item tutup">Tutup ({dataStatusPemantauanRaw?.[period]?.tutup || 0})</span>
    </div>
  );

  // Sekatan 'loading' jika data tiada
  if (!pieDataJenisKawalan) {
    return <div className="dashboard-loading">Memuatkan data...</div>;
  }

  // =========================================
  // ===== PAPARAN (RENDER) YANG BERSIH =====
  // =========================================

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
          <div className="comparison-title">Perbandingan Separuh Tahun </div>
          <div className="comparison-years">
            H1 {prevYear} <span className="vs">vs</span> H1 {baseYear}
          </div>
        </div>
      </div>

      {/* Grid kini memanggil komponen kecil dengan data dari props */}
      <div className="dashboard-grid-layout">
        
        <CartaPaiBandingan 
          title="JENIS KAWALAN"
          dataPrev={pieDataJenisKawalan.prev}
          dataCurrent={pieDataJenisKawalan.current}
          colors={colorsJenisKawalan}
          prevYear={prevYear}
          baseYear={baseYear}
          renderLegend={renderLegendJenisKawalan}
        />
        
        <CartaBarBertindanBandingan
          title="KATEGORI RISIKO (JADUAL)"
          dataPrev={stackedBarKategoriRisiko.prev}
          dataCurrent={stackedBarKategoriRisiko.current}
          legendMap={kategoriRisikoLegend}
          prevYear={prevYear}
          baseYear={baseYear}
          height={100}
        />
        
        <CartaBarBerkelompok
          title="PEMANTAUAN RISIKO"
          subtitle={`Perbandingan Risiko (${prevYear} vs ${baseYear})`}
          data={barDataPemantapan}
          barKeys={barKeysPemantapan}
          skorRisikoLegendData={skorRisikoLegendData}
        />
        
        <CartaPaiBandingan 
          title="STATUS PEMANTAUAN"
          dataPrev={pieDataStatusPemantauan.prev}
          dataCurrent={pieDataStatusPemantauan.current}
          colors={colorsStatusPemantauan}
          prevYear={prevYear}
          baseYear={baseYear}
          renderLegend={renderLegendStatusPemantauan}
        />
        
        <CartaBarBertindanBandingan
          title="STATUS PEMANTAUAN SUBSIDIARI"
          dataPrev={stackedBarStatusSubsidiari.prev}
          dataCurrent={stackedBarStatusSubsidiari.current}
          legendMap={legendMapStatusSubsidiari}
          prevYear={prevYear}
          baseYear={baseYear}
          height={120}
        />
      
      </div> {/* ===== TAMAT GRID ===== */}
    </div>
  );
}