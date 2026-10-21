import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { optionalAuth } from "../middlewares/auth";
import {
  createOrder,
  createOrderSchema,
  getOrderForViewer,
} from "../services/order.service";
import { z } from "zod";
import { createPayment, syncPayment } from "../services/payment.service";

type Handler = (req: Request, res: Response) => Promise<void>;

const wrap =
  (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "TOO_MANY_REQUESTS", message: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." },
  },
});

export const orderRouter = Router();

orderRouter.post(
  "/orders",
  orderLimiter,
  optionalAuth,
  wrap(async (req, res) => {
    const input = createOrderSchema.parse(req.body);
    const data = await createOrder(
      input,
      req.user ? { id: req.user.id, email: req.user.email } : undefined
    );
    res.status(201).json({ success: true, data });
  })
);

orderRouter.get(
  "/orders/:orderNumber",
  optionalAuth,
  wrap(async (req, res) => {
    const email = typeof req.query.email === "string" ? req.query.email : undefined;
    const data = await getOrderForViewer(
      String(req.params.orderNumber),
      req.user ? { id: req.user.id, role: req.user.role } : undefined,
      email
    );
    res.json({ success: true, data });
  })
);

const payBodySchema = z.object({
  email: z.string().trim().toLowerCase().email().optional(),
});

const payLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "TOO_MANY_REQUESTS", message: "Terlalu banyak permintaan. Coba lagi sebentar lagi." },
  },
});

orderRouter.post(
  "/orders/:orderNumber/pay",
  payLimiter,
  optionalAuth,
  wrap(async (req, res) => {
    const { email } = payBodySchema.parse(req.body ?? {});
    const data = await createPayment(
      String(req.params.orderNumber),
      req.user ? { id: req.user.id, role: req.user.role } : undefined,
      email
    );
    res.json({ success: true, data });
  })
);

orderRouter.post(
  "/orders/:orderNumber/sync",
  payLimiter,
  optionalAuth,
  wrap(async (req, res) => {
    const { email } = payBodySchema.parse(req.body ?? {});
    const data = await syncPayment(
      String(req.params.orderNumber),
      req.user ? { id: req.user.id, role: req.user.role } : undefined,
      email
    );
    res.json({ success: true, data });
  })
);