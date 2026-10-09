import { Router } from "express";

import {
  getPromotions,
  getAvailablePromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  setPromotionStatus,
  deletePromotion,
  getMyPromotions,
  createMyPromotion,
  updateMyPromotion,
  setMyPromotionStatus,
  deleteMyPromotion
} from "../controllers/promotion.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = Router();

// Cliente: promociones vigentes y reservables
// (opcional ?id_barbero=ID para ver solo las de ese barbero)
router.get("/disponibles", getAvailablePromotions);

// Barbero: sus propias promociones
// (van antes de "/:id" para que "mias" no se tome como un id)
router.get("/mias", authenticate, authorize("BARBERO"), getMyPromotions);
router.post("/mias", authenticate, authorize("BARBERO"), createMyPromotion);
router.put("/mias/:id", authenticate, authorize("BARBERO"), updateMyPromotion);
router.patch(
  "/mias/:id/status",
  authenticate,
  authorize("BARBERO"),
  setMyPromotionStatus
);
router.delete("/mias/:id", authenticate, authorize("BARBERO"), deleteMyPromotion);

// Admin: todas las promociones
router.get("/", authenticate, authorize("ADMIN"), getPromotions);

router.get("/:id", getPromotionById);

router.post("/", authenticate, authorize("ADMIN"), createPromotion);

router.put("/:id", authenticate, authorize("ADMIN"), updatePromotion);

router.patch(
  "/:id/status",
  authenticate,
  authorize("ADMIN"),
  setPromotionStatus
);

router.delete("/:id", authenticate, authorize("ADMIN"), deletePromotion);

export default router;
