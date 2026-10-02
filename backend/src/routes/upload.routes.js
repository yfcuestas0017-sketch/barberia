import { Router } from "express";
import { upload, saveImage } from "../config/cloudinary.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

// POST /api/upload — recibe una imagen y devuelve su URL pública
router.post("/", authenticate, upload.single("foto"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No se recibió ningún archivo" });
    }

    const url = await saveImage(req.file);

    res.json({ url });
  } catch (error) {
    console.error("Error subiendo imagen:", error);

    res.status(500).json({ message: "No se pudo subir la imagen" });
  }
});

export default router;
