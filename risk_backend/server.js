import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import rolesRoutes from "./routes/roles.js";
import subsidiariRoutes from "./routes/subsidiari.js";
import risikoRoutes from "./routes/risiko.js";
import tahunRoutes from "./routes/tahun.js";
import rawatanRoutes from "./routes/rawatan.js";
import pemantauanRoutes from "./routes/pemantauan.js";



dotenv.config();
const app = express();

// Allow requests from any localhost port (dev-friendly)
app.use(cors({
  origin: "http://localhost:5175",
  credentials: true,
}));


app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/subsidiari", subsidiariRoutes);
app.use("/api/risiko", risikoRoutes);
app.use("/api/tahun", tahunRoutes);
app.use("/api/rawatan", rawatanRoutes);
app.use('/api/pemantauan-risiko', pemantauanRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


