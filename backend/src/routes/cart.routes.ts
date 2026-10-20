import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { cartValidateSchema, validateCart } from "../services/cart.service";

type Handler = (req: Request, res: Response) => Promise<void>;

const wrap =
  (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

const cartLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "TOO_MANY_REQUESTS", message: "Terlalu banyak permintaan. Coba lagi sebentar lagi." },
  },
});

export const cartRouter = Router();

cartRouter.post(
  "/cart/validate",
  cartLimiter,
  wrap(async (req, res) => {
    const input = cartValidateSchema.parse(req.body);
    const data = await validateCart(input);
    res.json({ success: true, data });
  })
);