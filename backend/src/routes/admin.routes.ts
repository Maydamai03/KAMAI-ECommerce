import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { requireAdmin, requireAuth } from "../middlewares/auth";
import { getDashboard } from "../services/admin-dashboard.service";

type Handler = (req: Request, res: Response) => Promise<void>;

const wrap =
  (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

export const adminRouter = Router();

// Semua route di bawah ini hanya untuk admin
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get(
  "/dashboard",
  wrap(async (_req, res) => {
    res.json({ success: true, data: await getDashboard() });
  })
);