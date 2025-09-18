import React from "react";
import Sidebar from "./sidebar.jsx";
import Navbar from "./navbar.jsx";

export default function AppLayout({ children }) {
  return (
    <div style={{ display: "flex" }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div style={{ marginLeft: "240px", flex: 1 }}>
        {/* Navbar */}
        <Navbar />

        {/* Page content */}
        <div style={{ padding: "80px 20px 20px 20px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
