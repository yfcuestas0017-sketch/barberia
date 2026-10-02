import { Router } from "express";

import {
  getPromotions,
  getAvailablePromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  setPromotionStatus,
  deletePromotion
} from "../controllers/promotion.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = Router();

// Cliente: promociones vigentes y reservables
router.get("/disponibles", getAvailablePromotions);

// Admin: todas las promociones
router.get("/", authenticate, authorize("ADMIN"), getPromotions);

router.get("/:id", getPromotionById);

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  createPromotion
);

router.put(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  updatePromotion
);

router.patch(
  "/:id/status",
  authenticate,
  authorize("ADMIN"),
  setPromotionStatus
);

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  deletePromotion
);

export default router;
