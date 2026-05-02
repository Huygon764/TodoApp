import { Router } from "express";
import { requireCronSecret } from "../middleware/cronSecret.js";
import { triggerBackupPrompt } from "../controllers/backupController.js";

const router = Router();

router.post("/cron/backup-prompt", requireCronSecret, triggerBackupPrompt);

export default router;
