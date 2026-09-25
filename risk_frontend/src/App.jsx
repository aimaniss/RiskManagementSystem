import { BrowserRouter as Router, Routes, Route, Navigate, matchPath, useLocation } from "react-router-dom";

// Pages
import Login from "./pages/Login/Login";
import Unauthorized from "./pages/Unauthorized/Unauthorized";
import TukarKatalaluan from "./pages/TukarKatalaluan/TukarKatalaluan";
import PaparanUtama from "./pages/PaparanUtama/PaparanUtama";
import SenaraiRisiko from "./pages/SenaraiRisiko/SenaraiRisiko";
import DaftarRisiko from "./pages/DaftarRisiko/DaftarRisiko";
import RawatanRisiko from "./pages/RawatanRisiko/RawatanRisiko";
import PemantauanRisiko from "./pages/PemantauanRisiko/PemantauanRisiko";
import Pindaan from "./pages/Pindaan/Pindaan";
import Laporan from "./pages/Laporan/Laporan";
import UrusPengguna from "./pages/UrusPengguna/UrusPengguna";
import LogAktiviti from "./pages/LogAktiviti/LogAktiviti";
import TetapanSistem from "./pages/TetapanSistem/TetapanSistem";
import ModalButiranRisiko from "./pages/ButiranRisiko/ModalButiranRisiko";
import LogKeluar from "./pages/LogKeluar/LogKeluar";
import SenaraiTugasan from "./pages/SenaraiTugasan/SenaraiTugasan";

// Components
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import { useState } from "react";

// Halaman latar apabila /risiko/:id dibuka terus (tanpa state.latar)
const LATAR_LALAI = { pathname: "/SenaraiRisiko", search: "", hash: "", state: null, key: "latar-lalai" };

/**
 * Laluan dalam aplikasi. /risiko/:id tidak mempunyai halaman sendiri: halaman
 * latar (state.latar atau Senarai Risiko) kekal dipaparkan dan butiran dibuka
 * sebagai modal di atasnya (lihat hooks/useBukaRisiko).
 */
function LaluanAplikasi({ refreshRisiko, handleRefreshRisiko }) {
  const lokasi = useLocation();
  const modalRisiko = matchPath("/risiko/:id", lokasi.pathname);
  const lokasiHalaman = modalRisiko ? lokasi.state?.latar || LATAR_LALAI : lokasi;

  return (
    <>
      <Routes location={lokasiHalaman}>
        <Route index element={<PaparanUtama />} />
        <Route path="SenaraiRisiko" element={<SenaraiRisiko refreshTrigger={refreshRisiko} />} />
        <Route path="DaftarRisiko" element={<DaftarRisiko onSubmitSuccess={handleRefreshRisiko} />} />
        <Route path="SenaraiTugasan" element={<SenaraiTugasan />} />
        <Route path="RawatanRisiko" element={<RawatanRisiko />} />
        <Route path="PemantauanRisiko" element={<PemantauanRisiko />} />
        <Route path="Pindaan" element={<Pindaan />} />
        <Route path="Laporan" element={<Laporan />} />
        <Route path="UrusPengguna" element={<UrusPengguna />} />
        <Route path="LogAktiviti" element={<LogAktiviti />} />
        <Route path="TetapanSistem" element={<TetapanSistem />} />
        <Route path="LogKeluar" element={<LogKeluar />} />
      </Routes>
      {modalRisiko && (
        <Routes>
          <Route path="risiko/:id" element={<ModalButiranRisiko />} />
        </Routes>
      )}
    </>
  );
}

function App() {
  const [refreshRisiko, setRefreshRisiko] = useState(0);

  const handleRefreshRisiko = () => setRefreshRisiko(prev => prev + 1);

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/tukar-katalaluan" element={<TukarKatalaluan />} />

        {/* Protected routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute allowedRoles={["Admin","Executive","Ketua Subsidiari","Staff","Viewer"]}>
              <AppLayout>
                <LaluanAplikasi refreshRisiko={refreshRisiko} handleRefreshRisiko={handleRefreshRisiko} />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
