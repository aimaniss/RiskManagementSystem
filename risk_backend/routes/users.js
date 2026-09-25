import express from "express";
import multer from "multer";
import { verifyToken, authorizeKebenaran } from "../middleware/authMiddleware.js";
import {
  senaraiPengguna,
  profilSemasa,
  kemaskiniProfilSendiri,
  tambahPengguna,
  kemaskiniPengguna,
  padamPengguna,
  resetKatalaluanPengguna,
  tukarStatusPengguna,
} from "../controllers/userController.js";

const router = express.Router();
const upload = multer(); // memory storage

// GET all users (Admin sahaja — kebenaran `pengguna:urus`)
router.get("/", verifyToken, authorizeKebenaran("pengguna:urus"), senaraiPengguna);

// GET current logged-in user
router.get("/me", verifyToken, profilSemasa);

// PUT update current user profile
router.put("/me", verifyToken, upload.single("gambar_profil"), kemaskiniProfilSendiri);

// POST add new user (Admin sahaja)
router.post(
  "/",
  verifyToken,
  authorizeKebenaran("pengguna:urus"),
  upload.single("gambar_profil"),
  tambahPengguna
);

// PUT update user (Admin sahaja)
router.put(
  "/:id",
  verifyToken,
  authorizeKebenaran("pengguna:urus"),
  upload.single("gambar_profil"),
  kemaskiniPengguna
);

// POST reset kata laluan -> kata laluan sementara (Admin sahaja)
router.post(
  "/:id/reset-katalaluan",
  verifyToken,
  authorizeKebenaran("pengguna:urus"),
  resetKatalaluanPengguna
);

// PATCH aktif / nyahaktif akaun (Admin sahaja)
router.patch("/:id/status", verifyToken, authorizeKebenaran("pengguna:urus"), tukarStatusPengguna);

// DELETE user (Admin sahaja — soft-delete)
router.delete("/:id", verifyToken, authorizeKebenaran("pengguna:urus"), padamPengguna);

export default router;
