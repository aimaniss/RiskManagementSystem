import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import rolesRoutes from "./routes/roles.js";
import syarikatRoutes from "./routes/syarikat.js";
import bahagianRoutes from "./routes/bahagian.js";
import risikoRoutes from "./routes/risiko.js";
import tahunRoutes from "./routes/tahun.js";
import rawatanRoutes from "./routes/rawatan.js";
import pemantauanRoutes from "./routes/pemantauan.js";
import pindaanRoutes from "./routes/pindaan.js";
import logAktivitiRoutes from "./routes/log_aktiviti.js";
import laporanRoutes from "./routes/laporan.js";
import dashboardRoutes from "./routes/dashboard.js";
import notifikasiRoutes from "./routes/notifikasi.js";
import rujukanRoutes from "./routes/rujukan.js";
import { hadApi } from "./middleware/hadKadar.js";

dotenv.config();
const app = express();

// Di belakang reverse proxy (nginx/Docker), IP klien sebenar datang dari
// X-Forwarded-For; tanpa ini had kadar mengira semua pengguna sebagai satu IP.
if (process.env.TRUST_PROXY) {
  const nilai = process.env.TRUST_PROXY;
  app.set("trust proxy", /^\d+$/.test(nilai) ? parseInt(nilai, 10) : nilai);
}

app.use(helmet());
app.disable("x-powered-by");

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : ["http://localhost:5175"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use("/api", hadApi);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/syarikat", syarikatRoutes);
app.use("/api/bahagian", bahagianRoutes);
app.use("/api/risiko", risikoRoutes);
app.use("/api/tahun", tahunRoutes);
app.use("/api/rawatan", rawatanRoutes);
app.use("/api/pemantauan-risiko", pemantauanRoutes);
app.use("/api/pindaan", pindaanRoutes);
app.use("/api/log_aktiviti", logAktivitiRoutes);
app.use("/api/laporan", laporanRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifikasi", notifikasiRoutes);
app.use("/api/rujukan", rujukanRoutes);
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
