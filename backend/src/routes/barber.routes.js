import { Router } from "express";

import {
  getBarbers,
  getBarberById,
  createBarber,
  updateBarber,
  setBarberStatus,
  deleteBarber,
  getMyBarberProfile,
  updateMyBarberProfile
} from "../controllers/barber.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = Router();

router.get("/", getBarbers);

router.get(
  "/me",
  authenticate,
  authorize("BARBERO"),
  getMyBarberProfile
);

router.put(
  "/me",
  authenticate,
  authorize("BARBERO"),
  updateMyBarberProfile
);

router.get("/:id", getBarberById);

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  createBarber
);

router.put(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  updateBarber
);

router.patch(
  "/:id/status",
  authenticate,
  authorize("ADMIN"),
  setBarberStatus
);

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  deleteBarber
);

export default router;