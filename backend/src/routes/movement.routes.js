import express from "express";

import {
  getMovements,
  createMovement
} from "../controllers/movement.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = express.Router();

router.get(
  "/",
  authenticate,
  authorize("ADMIN"),
  getMovements
);

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  createMovement
);

export default router;