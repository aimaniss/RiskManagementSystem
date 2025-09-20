import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Pages
import Login from "./pages/Login/Login";
import Unauthorized from "./pages/Unauthorized/Unauthorized";
import PaparanUtama from "./pages/PaparanUtama/PaparanUtama";
import SenaraiRisiko from "./pages/SenaraiRisiko/SenaraiRisiko";
import DaftarRisiko from "./pages/DaftarRisiko/DaftarRisiko";
import RawatanRisiko from "./pages/RawatanRisiko/RawatanRisiko";
import PemantauanRisiko from "./pages/PemantauanRisiko/PemantauanRisiko";
import Pindaan from "./pages/Pindaan/Pindaan";
import Laporan from "./pages/Laporan/Laporan";
import UrusPengguna from "./pages/UrusPengguna/UrusPengguna";
import LogAktiviti from "./pages/LogAktiviti/LogAktiviti";
import LogKeluar from "./pages/LogKeluar/LogKeluar";

// Components
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import { useState } from "react";



function App() {
  const [refreshRisiko, setRefreshRisiko] = useState(0); // trigger untuk SenaraiRisiko

  const handleRefreshRisiko = () => setRefreshRisiko(prev => prev + 1);

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Protected routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute allowedRoles={["Admin","Executive","Ketua Subsidiari","Staff","Viewer"]}>
              <AppLayout>
                <Routes>
                  <Route index element={<PaparanUtama />} />
                  <Route 
                    path="SenaraiRisiko" 
                    element={<SenaraiRisiko refreshTrigger={refreshRisiko} />} 
                  />
                  <Route 
                    path="DaftarRisiko" 
                    element={<DaftarRisiko onSubmitSuccess={handleRefreshRisiko} />} 
                  />
                  <Route path="RawatanRisiko" element={<RawatanRisiko />} />
                  <Route path="PemantauanRisiko" element={<PemantauanRisiko />} />
                  <Route path="Pindaan" element={<Pindaan />} />
                  <Route path="Laporan" element={<Laporan />} />
                  <Route path="UrusPengguna" element={<UrusPengguna />} />
                  <Route path="LogAktiviti" element={<LogAktiviti />} />
                  <Route path="LogKeluar" element={<LogKeluar />} />
                </Routes>
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
