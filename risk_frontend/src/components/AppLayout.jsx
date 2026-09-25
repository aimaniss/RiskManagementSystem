import React, { useState, useEffect } from "react";
import Sidebar from "./sidebar.jsx";
import Navbar from "./navbar.jsx";
import { refreshAuthSession } from "../utils/auth";

const SIDEBAR_WIDTH = 220;
const NAVBAR_HEIGHT = 56;
const AUTH_REFRESH_INTERVAL_MS = 60_000;

export default function AppLayout({ children }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [, setAuthVersion] = useState(0);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      if (!localStorage.getItem("token")) return;

      try {
        const user = await refreshAuthSession();
        if (active && user) setAuthVersion((version) => version + 1);
      } catch (err) {
        const status = err.response?.status;
        if (active && [401, 403, 404].includes(status)) {
          localStorage.removeItem("token");
          window.location.assign("/login");
        }
      }
    };

    refresh();
    const interval = window.setInterval(refresh, AUTH_REFRESH_INTERVAL_MS);
    window.addEventListener("focus", refresh);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, []);

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
