export default function DashboardBoxes({ boxes, logo }) {
  return (
    <div className="dashboard-boxes">
      <div className="boxes-header">
        <img src={logo} alt="Subsidiary Logo" />
        <h3>Perbandingan Separuh Tahun</h3>
      </div>
      <div className="boxes-grid">
        {boxes.map((box, i) => (
          <div key={i} className="box-card">
            <div className="box-title">{box.title}</div>
            <div className="box-value">{box.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
