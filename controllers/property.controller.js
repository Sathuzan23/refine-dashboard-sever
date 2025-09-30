import propertyModel from "../mongodb/models/property.js";
import userModel from "../mongodb/models/user.js";
import mongoose from "mongoose";

import * as dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const getAllProperties = async (req, res) => {
  console.log(
    "getAllProperties - Full request query:",
    JSON.stringify(req.query, null, 2)
  );

  const {
    _end,
    _order,
    _start,
    _sort,
    title_like = "",
    propertyType = "",
    creator = "",
    // Check for Refine filter format
    creator_eq: creatorEq,
    filter,
  } = req.query;

  console.log("getAllProperties - Extracted params:");
  console.log("- creator:", creator);
  console.log("- creator_eq:", creatorEq);
  console.log("- filter:", filter);
  console.log("- title_like:", title_like);
  console.log("- propertyType:", propertyType);

  // Convert string parameters to appropriate types
  const limit = parseInt(_end) || 10;
  const skip = parseInt(_start) || 0;
  const sortField = _sort || "_id";
  const sortOrder = _order === "desc" ? -1 : 1;

  const query = {};

  if (propertyType && propertyType !== "All") {
    query.propertyType = propertyType;
  }

  if (title_like) {
    query.title = { $regex: title_like, $options: "i" };
  }

  // Check for creator filter in different formats
  const creatorId = creator || creatorEq;
  if (creatorId) {
    query.creator = creatorId;
    console.log("Setting creator filter to:", creatorId);
  }

  console.log("MongoDB query:", JSON.stringify(query, null, 2));

  try {
    const count = await propertyModel.countDocuments(query);
    const properties = await propertyModel
      .find(query)
      .populate("creator", "name email avatar") // Populate creator with user details
      .limit(limit)
      .skip(skip)
      .sort({ [sortField]: sortOrder });

    console.log("Found properties count:", count);
    console.log(
      "Sample properties (first 2):",
      properties.slice(0, 2).map((p) => ({
        id: p._id,
        title: p.title,
        creator: p.creator,
      }))
    );

    res.header("x-total-count", count);
    res.header("Access-Control-Expose-Headers", "x-total-count");

    res.status(200).json(properties);
  } catch (error) {
    console.error("Error fetching properties:", error);
    res
      .status(500)
      .json({ message: "Error fetching properties", error: error.message });
  }
};

const createProperty = async (req, res) => {
  try {
    const { title, description, propertyType, location, price, photo, email } =
      req.body;

    // Validate required fields
    if (
      !title ||
      !description ||
      !propertyType ||
      !location ||
      !price ||
      !photo ||
      !email
    ) {
      return res.status(400).json({
        message: "Missing required fields",
        received: {
          title: !!title,
          description: !!description,
          propertyType: !!propertyType,
          location: !!location,
          price: !!price,
          photo: !!photo,
          email: !!email,
        },
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    const user = await userModel.findOne({ email }).session(session);

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "User not found" });
    }

    const photoUrl = await cloudinary.uploader.upload(photo);

    const newProperty = new propertyModel({
      title,
      description,
      propertyType,
      location,
      price,
      photo: photoUrl.url,
      creator: user._id,
    });
    user.allProperties.push(newProperty);

    await newProperty.save({ session });
    await user.save({ session });
    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: "Property created successfully" });
  } catch (error) {
    console.error("Error creating property:", error);
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    res.status(500).json({
      message: "Error creating property",
      error: error.message,
    });
  }
};

const getPropertyById = async (req, res) => {
  const { id } = req.params;
  try {
    const property = await propertyModel.findById(id).populate("creator");
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }
    res.status(200).json(property);
  } catch (error) {
    res.status(500).json({ message: "Error fetching property" });
  }
};

const updateProperty = async (req, res) => {
  const { id } = req.params;

  console.log("Update request received for property ID:", id);
  console.log("Update data:", req.body);

  try {
    const { title, description, propertyType, location, price, photo } =
      req.body;

    // Validate required fields
    if (!title || !description || !propertyType || !location || !price) {
      return res.status(400).json({
        message: "Missing required fields",
        received: {
          title: !!title,
          description: !!description,
          propertyType: !!propertyType,
          location: !!location,
          price: !!price,
        },
      });
    }

    // Prepare update data
    const updateData = {
      title,
      description,
      propertyType,
      location,
      price,
    };

    // Handle photo update - only update if a new photo is provided
    if (photo && photo.startsWith("data:image/")) {
      // If it's a new base64 image, upload to cloudinary
      const photoUrl = await cloudinary.uploader.upload(photo);
      updateData.photo = photoUrl.url;
    } else if (photo && photo.startsWith("http")) {
      // If it's an existing URL, keep it as is
      updateData.photo = photo;
    }

    const updatedProperty = await propertyModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate("creator");

    if (!updatedProperty) {
      return res.status(404).json({ message: "Property not found" });
    }

    console.log("Property updated successfully:", updatedProperty._id);
    res.status(200).json(updatedProperty);
  } catch (error) {
    console.error("Error updating property:", error);
    res.status(500).json({
      message: "Error updating property",
      error: error.message,
    });
  }
};

const deleteProperty = async (req, res) => {
  const { id } = req.params;

  console.log("Delete request received for property ID:", id);

  if (!id || id === "undefined") {
    return res.status(400).json({ message: "Invalid property ID" });
  }

  try {
    const deletedProperty = await propertyModel.findByIdAndDelete(id);
    if (!deletedProperty) {
      return res.status(404).json({ message: "Property not found" });
    }
    res.status(200).json({ message: "Property deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    res
      .status(500)
      .json({ message: "Error deleting property", error: error.message });
  }
};

export {
  getAllProperties,
  createProperty,
  getPropertyById,
  updateProperty,
  deleteProperty,
};
