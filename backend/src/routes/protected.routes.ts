import { Router, Request } from "express";
import { requireAuth } from "../auth/requireAuth.js";

const router = Router();

// Add routes that require authentication below

router.get("/dashboard", requireAuth, (req: Request & { user?: any }, res) => {
  res.json({
    message: "You are authenticated",
    user: req.user,
  });
});

export default router;
