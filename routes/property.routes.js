import express from "express";

import {
  createProperty,
  getAllProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
} from "../controllers/property.controller.js";

const router = express.Router();

router.route("/").get(getAllProperties).post(createProperty);
router.route("/show/:id").get(getPropertyById);
router
  .route("/:id")
  .get(getPropertyById)
  .patch(updateProperty)
  .delete(deleteProperty);

export default router;
