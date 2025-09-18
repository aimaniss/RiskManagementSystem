// src/pages/Unauthorized/Unauthorized.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Unauthorized() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/login"); // redirect back to login
    }, 3000); // 3 seconds delay

    return () => clearTimeout(timer); // cleanup
  }, [navigate]);

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>❌ You are not authorized to access this page.</h2>
      <p>Redirecting to login...</p>
    </div>
  );
}
