import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { getProductOgHtml, getSitemapXml } from "../services/seo.service";

type Handler = (req: Request, res: Response) => Promise<void>;

const wrap =
  (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

export const seoRouter = Router();

seoRouter.get(
  "/sitemap.xml",
  wrap(async (_req, res) => {
    res.type("application/xml").set("Cache-Control", "public, max-age=600").send(await getSitemapXml());
  })
);

seoRouter.get(
  "/og/products/:slug",
  wrap(async (req, res) => {
    const html = await getProductOgHtml(String(req.params.slug));
    if (!html) {
      res.status(404).type("html").send("<!doctype html><title>Tidak ditemukan</title><p>Produk tidak ditemukan.</p>");
      return;
    }
    res.type("html").set("Cache-Control", "public, max-age=300").send(html);
  })
);