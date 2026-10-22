import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { requireAuth } from "../middlewares/auth";
import {
  addressSchema,
  createAddress,
  deleteAddress,
  listAddresses,
  updateAddress,
} from "../services/address.service";
import { z } from "zod";
import { listOrdersForUser } from "../services/order.service";

type Handler = (req: Request, res: Response) => Promise<void>;

const wrap =
  (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

export const meRouter = Router();

meRouter.use(requireAuth);

meRouter.get(
  "/addresses",
  wrap(async (req, res) => {
    const data = await listAddresses(req.user!.id);
    res.json({ success: true, data });
  })
);

meRouter.post(
  "/addresses",
  wrap(async (req, res) => {
    const input = addressSchema.parse(req.body);
    const data = await createAddress(req.user!.id, input);
    res.status(201).json({ success: true, data });
  })
);

meRouter.put(
  "/addresses/:id",
  wrap(async (req, res) => {
    const input = addressSchema.parse(req.body);
    const data = await updateAddress(req.user!.id, String(req.params.id), input);
    res.json({ success: true, data });
  })
);

meRouter.delete(
  "/addresses/:id",
  wrap(async (req, res) => {
    await deleteAddress(req.user!.id, String(req.params.id));
    res.json({ success: true, data: null });
  })
);

const ordersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

meRouter.get(
  "/orders",
  wrap(async (req, res) => {
    const query = ordersQuerySchema.parse(req.query);
    const data = await listOrdersForUser(req.user!.id, query.page, query.limit);
    res.json({ success: true, data });
  })
);  