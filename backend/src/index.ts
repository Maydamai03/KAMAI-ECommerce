import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { catalogRouter } from "./routes/catalog.routes";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { authRouter } from "./routes/auth.routes";
import { cartRouter } from "./routes/cart.routes";
import { meRouter } from "./routes/me.routes";
import { orderRouter } from "./routes/order.routes";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/me", meRouter);
app.use("/api", catalogRouter);
app.use("/api", cartRouter);
app.use("/api", orderRouter);

// Harus paling bawah
app.use("/api", notFoundHandler);
app.use(errorHandler);

const port = Number(process.env.PORT ?? 5000);
app.listen(port, () => {
  console.log(`API berjalan di http://localhost:${port}`);
});