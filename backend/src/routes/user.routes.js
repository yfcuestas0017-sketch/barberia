import express from "express";

import {
  getMyProfile,
  updateMyProfile,
  updatePassword
} from "../controllers/user.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = express.Router();

router.get(
  "/me",
  authenticate,
  getMyProfile
);

router.put(
  "/me",
  authenticate,
  updateMyProfile
);

router.put(
  "/me/password",
  authenticate,
  updatePassword
);

export default router;