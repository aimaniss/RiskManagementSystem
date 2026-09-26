import multer from "multer";

// Gambar profil disimpan terus dalam pengguna.gambar_profil (bytea), jadi saiz &
// jenis mesti dihadkan sebelum sampai ke controller.
export const SAIZ_MAKS_GAMBAR = 2 * 1024 * 1024;
const JENIS_DIBENARKAN = ["image/png", "image/jpeg", "image/webp"];

const upload = multer({
  limits: { fileSize: SAIZ_MAKS_GAMBAR, files: 1 },
  fileFilter: (req, file, cb) => {
    if (JENIS_DIBENARKAN.includes(file.mimetype)) return cb(null, true);
    const ralat = new Error("Gambar profil mesti fail PNG, JPEG atau WebP.");
    ralat.statusCode = 400;
    return cb(ralat);
  },
});

/** Terima satu fail `gambar_profil` (pilihan); ralat muat naik dipulangkan sebagai 400 */
export const muatNaikGambarProfil = (req, res, next) =>
  upload.single("gambar_profil")(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const mesej =
        err.code === "LIMIT_FILE_SIZE"
          ? "Saiz gambar profil melebihi 2 MB."
          : "Muat naik gambar profil tidak sah.";
      return res.status(400).json({ error: mesej });
    }
    if (err.statusCode === 400) return res.status(400).json({ error: err.message });
    console.error("Ralat muat naik gambar profil:", err);
    return res.status(500).json({ error: "Ralat pelayan semasa memuat naik gambar." });
  });
