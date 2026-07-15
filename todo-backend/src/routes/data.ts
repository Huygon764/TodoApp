import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { exportData, importData } from "../controllers/dataController.js";

const router = Router();

router.use(authenticate);

router.get("/export", exportData);
router.post("/import", importData);

export default router;
