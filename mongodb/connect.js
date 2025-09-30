import mongoose from "mongoose";

const connectDB = (url) => {
  mongoose.set("strictQuery", true);
  return mongoose
    .connect(url)
    .then(() => console.log("MongoDB connected"))
    .catch((error) => {
      console.error("MongoDB connection error:", error);
      process.exit(1);
    });
};

export default connectDB;
