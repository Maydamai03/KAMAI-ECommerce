import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import {
  areaQuerySchema,
  getRatesForCart,
  ratesRequestSchema,
  searchAreas,
} from "../services/shipping.service";

type Handler = (req: Request, res: Response) => Promise<void>;

const wrap =
  (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

const limiter = (limit: number) =>
  rateLimit({
    windowMs: 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: "TOO_MANY_REQUESTS", message: "Terlalu banyak permintaan. Coba lagi sebentar lagi." },
    },
  });

export const shippingRouter = Router();

shippingRouter.get(
  "/shipping/areas",
  limiter(60),
  wrap(async (req, res) => {
    const { q } = areaQuerySchema.parse(req.query);
    const data = await searchAreas(q);
    res.json({ success: true, data });
  })
);

shippingRouter.post(
  "/shipping/rates",
  limiter(30),
  wrap(async (req, res) => {
    const input = ratesRequestSchema.parse(req.body);
    const data = await getRatesForCart(input);
    res.json({ success: true, data });
  })
);