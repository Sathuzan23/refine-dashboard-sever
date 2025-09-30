import express from "express";

import {
  createUser,
  getAllUsers,
  getUserById,
} from "../controllers/user.controller.js";

const router = express.Router();

router.route("/").get(getAllUsers).post(createUser);
router.route("/show/:id").get(getUserById);
router.route("/:id").get(getUserById);

export default router;
