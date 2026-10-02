import { Router } from "express";

import {
  getServices,
  getServiceById,
  createService,
  updateService,
  setServiceStatus,
  deleteService,
} from "../controllers/service.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = Router();

router.get("/", getServices);

router.get("/:id", getServiceById);

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  createService
);

router.put(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  updateService
);

router.patch(
  "/:id/status",
  authenticate,
  authorize("ADMIN"),
  setServiceStatus
);

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  deleteService
);

export default router;