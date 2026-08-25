import React, { useState, useEffect } from "react";
import Sidebar from "./sidebar.jsx";
import Navbar from "./navbar.jsx";

const SIDEBAR_WIDTH = 220;
const NAVBAR_HEIGHT = 56;

export default function AppLayout({ children }) {
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (modalOpen) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
  }, [modalOpen]);

  const handleModalToggle = (isOpen) => setModalOpen(isOpen);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div style={{ marginLeft: `${SIDEBAR_WIDTH}px` }}>
        <Navbar />
        <main
          style={{ paddingTop: `${NAVBAR_HEIGHT + 20}px` }}
          className="px-6 pb-10"
        >
          <div className="mx-auto w-full max-w-[1440px]">
            {React.Children.map(children, (child) =>
              React.cloneElement(child, { setModalOpen: handleModalToggle })
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
