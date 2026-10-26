import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { requireAdmin, requireAuth } from "../middlewares/auth";
import { getDashboard } from "../services/admin-dashboard.service";
import {
  categorySchema,
  createAdminCategory,
  deleteAdminCategory,
  listAdminCategories,
  updateAdminCategory,
} from "../services/admin-category.service";
import {
  adminListQuerySchema,
  createAdminProduct,
  deleteAdminProduct,
  flagsSchema,
  getAdminProduct,
  listAdminProducts,
  productSchema,
  setProductFlags,
  updateAdminProduct,
} from "../services/admin-product.service";

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

/* Kategori */

adminRouter.get(
  "/categories",
  wrap(async (_req, res) => {
    res.json({ success: true, data: await listAdminCategories() });
  })
);

adminRouter.post(
  "/categories",
  wrap(async (req, res) => {
    const input = categorySchema.parse(req.body);
    res.status(201).json({ success: true, data: await createAdminCategory(input) });
  })
);

adminRouter.put(
  "/categories/:id",
  wrap(async (req, res) => {
    const input = categorySchema.parse(req.body);
    res.json({ success: true, data: await updateAdminCategory(String(req.params.id), input) });
  })
);

adminRouter.delete(
  "/categories/:id",
  wrap(async (req, res) => {
    await deleteAdminCategory(String(req.params.id));
    res.json({ success: true, data: null });
  })
);

/* Produk */

adminRouter.get(
  "/products",
  wrap(async (req, res) => {
    const query = adminListQuerySchema.parse(req.query);
    res.json({ success: true, data: await listAdminProducts(query) });
  })
);

adminRouter.get(
  "/products/:id",
  wrap(async (req, res) => {
    res.json({ success: true, data: await getAdminProduct(String(req.params.id)) });
  })
);

adminRouter.post(
  "/products",
  wrap(async (req, res) => {
    const input = productSchema.parse(req.body);
    res.status(201).json({ success: true, data: await createAdminProduct(input) });
  })
);

adminRouter.put(
  "/products/:id",
  wrap(async (req, res) => {
    const input = productSchema.parse(req.body);
    res.json({ success: true, data: await updateAdminProduct(String(req.params.id), input) });
  })
);

adminRouter.patch(
  "/products/:id/flags",
  wrap(async (req, res) => {
    const flags = flagsSchema.parse(req.body);
    await setProductFlags(String(req.params.id), flags);
    res.json({ success: true, data: null });
  })
);

adminRouter.delete(
  "/products/:id",
  wrap(async (req, res) => {
    await deleteAdminProduct(String(req.params.id));
    res.json({ success: true, data: null });
  })
);