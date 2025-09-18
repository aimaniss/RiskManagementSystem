export default function DashboardHeader({ setShowModal }) {
  return (
    <div className="dashboard-header">
      <h1>Paparan Utama</h1>
      <button onClick={() => setShowModal(true)}>Filter</button>
    </div>
  );
}
