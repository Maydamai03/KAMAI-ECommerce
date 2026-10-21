import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { handleNotification, notificationSchema } from "../services/payment.service";

type Handler = (req: Request, res: Response) => Promise<void>;

const wrap =
  (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

export const paymentRouter = Router();

paymentRouter.post(
  "/payments/midtrans/webhook",
  webhookLimiter,
  wrap(async (req, res) => {
    const payload = notificationSchema.parse(req.body);
    const outcome = await handleNotification(payload);
    // Selalu 200 untuk notifikasi sah, supaya Midtrans tidak mengirim ulang tanpa henti
    res.status(200).json({ success: true, data: { outcome } });
  })
);