import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} = process.env;

const cloudinaryEnabled = Boolean(
  CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET
);

if (cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
}

// El archivo llega en memoria; luego se manda a Cloudinary (o a disco en local)
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten imágenes JPG, PNG, WEBP o GIF"), false);
    }
  },
});

// Devuelve la URL pública de la imagen
export const saveImage = async (file) => {
  // Producción: Cloudinary (el disco de Render se borra en cada deploy)
  if (cloudinaryEnabled) {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: "barberia" }, (error, result) => {
          if (error) return reject(error);
          resolve(result.secure_url);
        })
        .end(file.buffer);
    });
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Faltan las variables CLOUDINARY_* en producción");
  }

  // Desarrollo: guarda en backend/uploads/
  const uploadsDir = path.join(__dirname, "../../uploads");
  fs.mkdirSync(uploadsDir, { recursive: true });

  const ext = path.extname(file.originalname).toLowerCase();
  const name = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;

  await fs.promises.writeFile(path.join(uploadsDir, name), file.buffer);

  const baseUrl =
    process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;

  return `${baseUrl}/uploads/${name}`;
};
