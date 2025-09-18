import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import NotificationIcon from "../assets/icons/icon_notification.svg";
import UserPlaceholder from "../assets/icons/icon_user_placeholder.svg";
import "./Navbar.css";

function Navbar() {
  const [user, setUser] = useState({ name: "User", role: "" });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const roleMapping = {
          1: "ADMIN",
          2: "EXECUTIVE",
          3: "KETUA SUBSIDIARI",
          4: "STAFF",
          5: "VIEWER",
        };
        setUser({
          name: decoded.name || "User",
          role: roleMapping[decoded.peranan_id] || "User",
        });
      } catch (err) {
        console.error("Invalid token", err);
        localStorage.removeItem("token");
      }
    }
  }, []);

  return (
    <div className="navbar">
      {/* Notification icon */}
      <div className="navbar-notification">
        <img src={NotificationIcon} alt="Notifications" />
      </div>

      {/* User info */}
      <div className="navbar-user">
        <div className="navbar-user-info">
          <div className="user-name">{user.name}</div>
          <div className="user-role">{user.role}</div>
        </div>
        <img src={UserPlaceholder} alt="User" />
      </div>
    </div>
  );
}

export default Navbar;
