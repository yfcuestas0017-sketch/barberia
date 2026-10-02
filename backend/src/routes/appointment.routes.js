import { Router } from "express";

import {
  getAvailableSlots,
  createAppointment,
  getMyAppointments,
  getMyBarberAppointments,
  updateAppointmentStatus,
  getAdminAppointments
} from "../controllers/appointment.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = Router();


// Disponibilidad pública
router.get(
  "/availability",
  getAvailableSlots
);


// Crear cita - solamente cliente
router.post(
  "/",
  authenticate,
  authorize("CLIENTE"),
  createAppointment
);


// Mis citas - cliente
router.get(
  "/my",
  authenticate,
  authorize("CLIENTE"),
  getMyAppointments
);


// Citas del barbero
router.get(
  "/barber/my",
  authenticate,
  authorize("BARBERO"),
  getMyBarberAppointments
);

router.put(
  "/:id/status",
  authenticate,
  authorize("BARBERO"),
  updateAppointmentStatus
);

router.get(
  "/admin",
  authenticate,
  authorize("ADMIN"),
  getAdminAppointments
);


export default router;