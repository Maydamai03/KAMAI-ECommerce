import { Suspense } from "react";
import { Outlet, ScrollRestoration } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import CartDrawer from "./CartDrawer";
import CartSync from "./CartSync";
import PageFallback from "./PageFallback";

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:bg-black focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Lewati ke konten
      </a>
      <Navbar />
      <main id="konten" tabIndex={-1} className="min-h-[calc(100vh-4rem)] flex-1 outline-none">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <CartDrawer />
      <CartSync />
      <ScrollRestoration />
    </div>
  );
}