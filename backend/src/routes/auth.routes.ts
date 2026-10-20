import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { COOKIE_NAME, cookieOptions, signToken } from "../lib/jwt";
import { requireAuth } from "../middlewares/auth";
import {
  loginSchema,
  loginUser,
  registerSchema,
  registerUser,
} from "../services/auth.service";

type Handler = (req: Request, res: Response) => Promise<void> | void;

const wrap =
  (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.",
    },
  },
});

export const authRouter = Router();

authRouter.post(
  "/register",
  authLimiter,
  wrap(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const user = await registerUser(input);
    res.cookie(COOKIE_NAME, signToken(user), cookieOptions);
    res.status(201).json({ success: true, data: { user } });
  })
);

authRouter.post(
  "/login",
  authLimiter,
  wrap(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const user = await loginUser(input);
    res.cookie(COOKIE_NAME, signToken(user), cookieOptions);
    res.json({ success: true, data: { user } });
  })
);

authRouter.post(
  "/logout",
  wrap((_req, res) => {
    const { maxAge: _maxAge, ...clearOptions } = cookieOptions;
    res.clearCookie(COOKIE_NAME, clearOptions);
    res.json({ success: true, data: null });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  wrap((req, res) => {
    res.json({ success: true, data: { user: req.user } });
  })
);