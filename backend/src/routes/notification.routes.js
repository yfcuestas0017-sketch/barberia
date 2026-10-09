import { Router } from "express";

import {
  getVapidPublicKey,
  subscribe,
  unsubscribe,
  sendTest,
  diagnostics
} from "../controllers/notification.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = Router();

router.get("/vapid-public-key", getVapidPublicKey);

router.post("/subscribe", authenticate, authorize("BARBERO"), subscribe);
router.post("/unsubscribe", authenticate, authorize("BARBERO"), unsubscribe);
router.post("/test", authenticate, authorize("BARBERO"), sendTest);

router.get("/diagnostico", authenticate, authorize("ADMIN"), diagnostics);

export default router;
