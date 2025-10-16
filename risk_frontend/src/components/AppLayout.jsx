import React, { useState, useEffect } from "react";
import Sidebar from "./sidebar.jsx";
import Navbar from "./navbar.jsx";

export default function AppLayout({ children }) {
  const [modalOpen, setModalOpen] = useState(false);

  // Apply/remove class pada body bila modal buka/tutup
  useEffect(() => {
    if (modalOpen) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
  }, [modalOpen]);

  // Pass function toggle ke children
  const handleModalToggle = (isOpen) => setModalOpen(isOpen);

  return (
    <div className="app-wrapper" style={{ display: "flex" }}>
      <Sidebar />
      <div style={{ marginLeft: "210px", flex: 1 }}>
        <Navbar />
        <div style={{ padding: "60px 20px 20px 20px" }}>
          {React.Children.map(children, (child) =>
            React.cloneElement(child, { setModalOpen: handleModalToggle })
          )}
        </div>
      </div>
    </div>
  );
}
