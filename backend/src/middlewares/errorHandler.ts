import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors";
import multer from "multer";

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: "Endpoint tidak ditemukan" },
  });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Input tidak valid", details: err.issues },
    });
    return;
  }
    const bodyErrorType = (err as { type?: string } | null)?.type;
  if (bodyErrorType === "entity.parse.failed") {
    res.status(400).json({
      success: false,
      error: { code: "INVALID_JSON", message: "Isi permintaan bukan JSON yang valid" },
    });
    return;
  }
  if (bodyErrorType === "entity.too.large") {
    res.status(413).json({
      success: false,
      error: { code: "PAYLOAD_TOO_LARGE", message: "Ukuran permintaan terlalu besar" },
    });
    return;
  }
    if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Ukuran gambar maksimal 5 MB per berkas."
        : err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE"
          ? "Terlalu banyak berkas. Maksimal 8 gambar per unggahan."
          : "Gagal membaca berkas unggahan.";
    res.status(400).json({ success: false, error: { code: "UPLOAD_ERROR", message } });
    return;
  }
    if (err instanceof AppError) {
    res.status(err.status).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }
  console.error(err);
  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan pada server" },
  });
};