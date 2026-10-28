import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import {
  listQuerySchema,
  listProducts,
  getProductBySlug,
  getFilterOptions,
} from "../services/product.service";
import { listCategories } from "../services/category.service";
import { getPublicStore } from "../services/store-settings.service";
import { listPublicBanners } from "../services/banner.service";

type Handler = (req: Request, res: Response) => Promise<void>;

// Meneruskan error async ke errorHandler (aman untuk Express 4 maupun 5)
const wrap =
  (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

export const catalogRouter = Router();

catalogRouter.get(
  "/products",
  wrap(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const data = await listProducts(query);
    res.json({ success: true, data });
  })
);

catalogRouter.get(
  "/products/filters",
  wrap(async (_req, res) => {
    const data = await getFilterOptions();
    res.json({ success: true, data });
  })
);

catalogRouter.get(
  "/store",
  wrap(async (_req, res) => {
    res.json({ success: true, data: await getPublicStore() });
  })
);

catalogRouter.get(
  "/banners",
  wrap(async (_req, res) => {
    res.json({ success: true, data: await listPublicBanners() });
  })
);

catalogRouter.get(
  "/products/:slug",
  wrap(async (req, res) => {
    const data = await getProductBySlug(String(req.params.slug));
    res.json({ success: true, data });
  })
);

catalogRouter.get(
  "/categories",
  wrap(async (_req, res) => {
    const data = await listCategories();
    res.json({ success: true, data });
  })
);