import { Router } from "express";

import {
  register,
  login,
} from "../controllers/auth.controller.js";

import {
  forgotPassword,
  verifyResetCode,
  resetPassword,
} from "../controllers/passwordReset.controller.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);

// Recuperar contraseña por WhatsApp
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-code", verifyResetCode);
router.post("/reset-password", resetPassword);

export default router;