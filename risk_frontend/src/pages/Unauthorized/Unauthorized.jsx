// src/pages/Unauthorized/Unauthorized.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Unauthorized() {
  const navigate = useNavigate();

  useEffect(() => {
    // 1. **TAMBAH: Padamkan token lama dari localStorage**
    // Ini memastikan sesi lama dimatikan sepenuhnya.
    localStorage.removeItem("token"); 

    // 2. Tetapkan timer untuk redirect
    const timer = setTimeout(() => {
      // Halakan pengguna ke page log masuk
      navigate("/login"); 
    }, 3000); // 3 saat delay

    // Cleanup: Membersihkan timer apabila komponen dibongkar
    return () => clearTimeout(timer); 

  }, [navigate]); 

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>❌ Anda tidak dibenarkan mengakses halaman ini.</h2>
      <p>Sesi anda mungkin telah tamat tempoh. Menghalakan ke log masuk...</p>
      {/* Jika anda mahu pengguna klik butang untuk log masuk tanpa menunggu */}
      <button 
        onClick={() => navigate("/login")} 
        style={{ padding: '10px 20px', marginTop: '20px', cursor: 'pointer' }}
      >
        Log Masuk Sekarang
      </button>
    </div>
  );
}