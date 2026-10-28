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
import multer from "multer";
import { storageConfig } from "../config/storage";
import {
  deleteProductImage,
  reorderProductImages,
  reorderSchema,
  uploadProductImages,
} from "../services/admin-image.service";
import {
  addOrderNote,
  changeOrderStatus,
  getAdminOrder,
  listAdminOrders,
  noteSchema,
  orderListQuerySchema,
  shipmentSchema,
  statusChangeSchema,
  updateShipment,
} from "../services/admin-order.service";
import { getRevenueSeries, revenueQuerySchema } from "../services/admin-revenue.service";

import {
  getAdminSettings,
  manualConfigSchema,
  originSchema,
  previewManualRates,
  previewSchema,
  profileSchema,
  resetManualRates,
  updateManualRates,
  updateOrigin,
  updateProfile,
} from "../services/admin-settings.service";
import {
  bannerCreateSchema,
  bannersUpdateSchema,
  createBanner,
  deleteBanner,
  listAdminBanners,
  updateBanners,
} from "../services/banner.service";

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

/* Gambar produk */

const upload = multer({
  storage: multer.memoryStorage(), // berkas diproses di memori, tidak ditulis ke disk oleh Multer
  limits: { fileSize: storageConfig.maxFileBytes, files: storageConfig.maxImagesPerProduct },
});

adminRouter.post(
  "/products/:id/images",
  upload.array("images", storageConfig.maxImagesPerProduct),
  wrap(async (req, res) => {
    const files = (req.files ?? []) as Express.Multer.File[];
    const data = await uploadProductImages(String(req.params.id), files);
    res.status(201).json({ success: true, data });
  })
);

adminRouter.put(
  "/products/:id/images/order",
  wrap(async (req, res) => {
    const { imageIds } = reorderSchema.parse(req.body);
    const data = await reorderProductImages(String(req.params.id), imageIds);
    res.json({ success: true, data });
  })
);

adminRouter.delete(
  "/products/:id/images/:imageId",
  wrap(async (req, res) => {
    const data = await deleteProductImage(String(req.params.id), String(req.params.imageId));
    res.json({ success: true, data });
  })
);

/* Pesanan */

adminRouter.get(
  "/orders",
  wrap(async (req, res) => {
    const query = orderListQuerySchema.parse(req.query);
    res.json({ success: true, data: await listAdminOrders(query) });
  })
);

adminRouter.get(
  "/orders/:orderNumber",
  wrap(async (req, res) => {
    res.json({ success: true, data: await getAdminOrder(String(req.params.orderNumber)) });
  })
);

adminRouter.patch(
  "/orders/:orderNumber/status",
  wrap(async (req, res) => {
    const input = statusChangeSchema.parse(req.body);
    const data = await changeOrderStatus(String(req.params.orderNumber), input, req.user!.id);
    res.json({ success: true, data });
  })
);

adminRouter.post(
  "/orders/:orderNumber/notes",
  wrap(async (req, res) => {
    const { note } = noteSchema.parse(req.body);
    const data = await addOrderNote(String(req.params.orderNumber), note, req.user!.id);
    res.status(201).json({ success: true, data });
  })
);

adminRouter.put(
  "/orders/:orderNumber/shipment",
  wrap(async (req, res) => {
    const input = shipmentSchema.parse(req.body);
    const data = await updateShipment(String(req.params.orderNumber), input, req.user!.id);
    res.json({ success: true, data });
  })
);

adminRouter.get(
  "/revenue",
  wrap(async (req, res) => {
    const { range } = revenueQuerySchema.parse(req.query);
    res.json({ success: true, data: await getRevenueSeries(range) });
  })
);

/* Pengaturan toko */

adminRouter.get(
  "/settings",
  wrap(async (_req, res) => {
    res.json({ success: true, data: await getAdminSettings() });
  })
);

adminRouter.put(
  "/settings/profile",
  wrap(async (req, res) => {
    const input = profileSchema.parse(req.body);
    res.json({ success: true, data: await updateProfile(input) });
  })
);

adminRouter.put(
  "/settings/origin",
  wrap(async (req, res) => {
    const input = originSchema.parse(req.body);
    res.json({ success: true, data: await updateOrigin(input) });
  })
);

adminRouter.put(
  "/settings/shipping-rates",
  wrap(async (req, res) => {
    const config = manualConfigSchema.parse(req.body);
    res.json({ success: true, data: await updateManualRates(config) });
  })
);

adminRouter.post(
  "/settings/shipping-rates/reset",
  wrap(async (_req, res) => {
    res.json({ success: true, data: await resetManualRates() });
  })
);

adminRouter.post(
  "/settings/shipping-rates/preview",
  wrap(async (req, res) => {
    const input = previewSchema.parse(req.body);
    res.json({ success: true, data: await previewManualRates(input) });
  })
);

/* Banner beranda */

const bannerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: storageConfig.maxFileBytes, files: 1 },
});

adminRouter.get(
  "/settings/banners",
  wrap(async (_req, res) => {
    res.json({ success: true, data: await listAdminBanners() });
  })
);

adminRouter.post(
  "/settings/banners",
  bannerUpload.single("image"),
  wrap(async (req, res) => {
    const input = bannerCreateSchema.parse(req.body ?? {});
    res.status(201).json({ success: true, data: await createBanner(req.file, input) });
  })
);

adminRouter.put(
  "/settings/banners",
  wrap(async (req, res) => {
    const { banners } = bannersUpdateSchema.parse(req.body);
    res.json({ success: true, data: await updateBanners(banners) });
  })
);

adminRouter.delete(
  "/settings/banners/:id",
  wrap(async (req, res) => {
    res.json({ success: true, data: await deleteBanner(String(req.params.id)) });
  })
);