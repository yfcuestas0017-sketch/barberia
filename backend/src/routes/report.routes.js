import express from "express";

import {
  getAdminReport,
  getBarberReport
} from "../controllers/report.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = express.Router();

router.get(
  "/admin",
  authenticate,
  authorize("ADMIN"),
  getAdminReport
);

router.get(
  "/barber",
  authenticate,
  authorize("BARBERO"),
  getBarberReport
);

export default router;