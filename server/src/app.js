import express from "express";
import cors from "cors";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      message: "Outly API is running",
    },
  });
});

app.use(errorHandler);


export default app;