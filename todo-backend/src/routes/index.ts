import { Router } from "express";
import authRouter from "./auth.js";
import daysRouter from "./days.js";
import defaultRouter from "./default.js";

const router = Router();

router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Todo API is healthy",
    timestamp: new Date().toISOString(),
  });
});

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Todo App API",
    version: "1.0.0",
  });
});

router.use("/auth", authRouter);
router.use("/days", daysRouter);
router.use("/default", defaultRouter);

export default router;
