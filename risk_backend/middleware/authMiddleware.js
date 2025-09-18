import jwt from "jsonwebtoken";

// Verify JWT token
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { pengguna_id, staff_id, peranan_id, nama_peranan, subsidiari_id, permissions }
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid token" });
  }
};

// Authorize based on role(s)
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user.nama_peranan; // role from JWT
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: "No permission" });
    }
    next();
  };
};
