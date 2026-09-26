import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "./sidebar.jsx";
import Navbar from "./navbar.jsx";
import { refreshAuthSession } from "../utils/auth";

const NAVBAR_HEIGHT = 56;
const AUTH_REFRESH_INTERVAL_MS = 60_000;

export default function AppLayout({ children }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [menuBuka, setMenuBuka] = useState(false);
  const location = useLocation();

  // Tutup menu luncur (skrin kecil) selepas navigasi
  useEffect(() => {
    setMenuBuka(false);
  }, [location.pathname]);
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

  // Latar kelabu sangat cerah supaya kad & sidebar putih terpisah; hanya susun atur utama
  return (
    <div className="min-h-screen bg-[#f6f8fb] dark:bg-background">
      <Sidebar terbuka={menuBuka} />
      <button
        type="button"
        onClick={() => setMenuBuka((b) => !b)}
        className="fixed left-3 top-2.5 z-50 flex h-9 w-9 items-center justify-center rounded-md border bg-card text-foreground lg:hidden"
        aria-label="Menu"
        aria-expanded={menuBuka}
      >
        <Menu size={18} />
      </button>
      {menuBuka && (
        <div
          className="fixed inset-0 z-[55] bg-black/40 lg:hidden"
          onClick={() => setMenuBuka(false)}
          aria-hidden="true"
        />
      )}
      <div className="lg:ml-[220px]">
        <Navbar />
        <main
          style={{ paddingTop: `${NAVBAR_HEIGHT + 20}px` }}
          className="px-3 pb-10 sm:px-6"
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
