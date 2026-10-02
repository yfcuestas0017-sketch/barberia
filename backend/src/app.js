import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.routes.js";
import barberRoutes from "./routes/barber.routes.js";
import serviceRoutes from "./routes/service.routes.js";
import promotionRoutes from "./routes/promotion.routes.js";
import scheduleRoutes from "./routes/schedule.routes.js";
import appointmentRoutes from "./routes/appointment.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import reportRoutes from "./routes/report.routes.js";
import movementRoutes from "./routes/movement.routes.js";
import userRoutes from "./routes/user.routes.js";
import uploadRoutes from "./routes/upload.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// FRONTEND_URL puede tener varias URLs separadas por coma (sin "/" final)
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((url) => url.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite herramientas sin origin (Postman, health checks)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(null, false);
    },
    credentials: true,
  })
);

app.use(express.json());

// Servir imágenes subidas como archivos estáticos → GET /uploads/nombre.jpg
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"))
);

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "API de barbería funcionando",
  });
});

app.use("/api/reports", reportRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/barbers", barberRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/movements", movementRoutes);
app.use("/api/users", userRoutes);
app.use("/api/upload", uploadRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "Ruta no encontrada",
  });
});

export default app;