import express from "express";

import {
  createReview,
  getBarberReviews,
  getMyReviews,
  getAllReviews
} from "../controllers/review.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = express.Router();

// Cliente deja reseña
router.post(
  "/",
  authenticate,
  authorize("CLIENTE"),
  createReview
);

// Reseñas públicas de un barbero
router.get(
  "/barber/:id",
  getBarberReviews
);

// Reseñas del barbero autenticado
router.get(
  "/my",
  authenticate,
  authorize("BARBERO"),
  getMyReviews
);

router.get(
  "/admin",
  authenticate,
  authorize("ADMIN"),
  getAllReviews
);

export default router;