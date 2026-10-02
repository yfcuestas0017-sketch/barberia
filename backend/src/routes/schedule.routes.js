import { Router } from "express";

import {
  getMySchedules,
  createSchedule,
  deleteSchedule
} from "../controllers/schedule.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = Router();

router.get(
  "/me",
  authenticate,
  authorize("BARBERO"),
  getMySchedules
);

router.post(
  "/",
  authenticate,
  authorize("BARBERO"),
  createSchedule
);

router.delete(
  "/:id",
  authenticate,
  authorize("BARBERO"),
  deleteSchedule
);

export default router;