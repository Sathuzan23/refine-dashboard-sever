import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";

import connectDB from "./mongodb/connect.js";
import userRouter from "./routes/user.routes.js";
import propertyRouter from "./routes/property.routes.js";

dotenv.config();

const app = express();
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "50mb" }));

app.use("/api/v1/users", userRouter);
app.use("/api/v1/agents", userRouter); // Map agents to users
app.use("/api/v1/properties", propertyRouter);

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

const startServer = async () => {
  const PORT = process.env.PORT;
  const MONGODB_URL = process.env.MONGODB_URL;
  try {
    await connectDB(MONGODB_URL);
    app.listen(PORT, () => {
      console.log(`Server is running on port http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Error during server initialization:", error);
    process.exit(1);
  }
};

startServer();
