import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAdminDashboard } from "../../services/admin";
import { formatDateTime, formatRupiah } from "../../lib/format";
import { STATUS_LABEL, STATUS_STYLE } from "../../lib/orderStatus";
import type { OrderStatus } from "../../types";

const STATUS_ORDER: OrderStatus[] = [
  "PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "COMPLETED",
  "EXPIRED",
  "CANCELLED",
];

function Stat({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string | number;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`border bg-white p-4 ${highlight ? "border-black" : "border-neutral-200"}`}>
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const dash = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: getAdminDashboard,
    staleTime: 30_000,
  });

  if (dash.isLoading) {
    return <p className="text-sm text-neutral-500">Memuat dashboard...</p>;
  }

  if (dash.isError || !dash.data) {
    return (
      <p className="text-sm text-red-600">
        Gagal memuat dashboard.{" "}
        <button type="button" onClick={() => dash.refetch()} className="underline">
          Coba lagi
        </button>
      </p>
    );
  }

  const d = dash.data;
  const maxDay = Math.max(1, ...d.revenueByDay.map((x) => x.total));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Pesanan hari ini" value={d.ordersToday} />
        <Stat
          label="Perlu diproses"
          value={d.needsProcessing}
          hint="Sudah dibayar, belum diproses"
          highlight={d.needsProcessing > 0}
        />
        <Stat label="Pendapatan 7 hari" value={formatRupiah(d.revenue7Days)} hint="Dari pembayaran diterima" />
        <Stat label="Stok menipis" value={d.lowStock.length} hint="Varian dengan stok 3 atau kurang" />
      </div>

      <section className="border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide">Pendapatan 7 hari terakhir</h2>
        <div className="mt-4 flex h-40 items-end gap-2">
          {d.revenueByDay.map((day) => (
            <div key={day.date} className="flex h-full flex-1 flex-col items-center justify-end">
              <div
                title={`${day.date}: ${formatRupiah(day.total)}`}
                className={day.total > 0 ? "w-full bg-black" : "w-full bg-neutral-200"}
                style={{ height: day.total > 0 ? `${Math.max(4, (day.total / maxDay) * 100)}%` : "2px" }}
              />
              <span className="mt-2 text-xs text-neutral-500">
                {day.date.slice(8, 10)}/{day.date.slice(5, 7)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide">Pesanan menurut status</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {STATUS_ORDER.map((s) => (
              <li key={s} className="flex items-center justify-between">
                <span className={`px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[s]}`}>{STATUS_LABEL[s]}</span>
                <span className="font-medium">{d.statusCounts[s]}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-neutral-500">
            {d.productCount} produk aktif &middot; {d.customerCount} pelanggan terdaftar
          </p>
        </section>

        <section className="border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide">Stok menipis</h2>
          {d.lowStock.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">Semua stok aman.</p>
          ) : (
            <ul className="mt-3 divide-y divide-neutral-200 text-sm">
              {d.lowStock.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    <Link to={`/products/${v.slug}`} className="hover:underline">
                      {v.productName}
                    </Link>
                    <span className="block text-xs text-neutral-500">{v.variant}</span>
                  </span>
                  <span className={`font-semibold ${v.stock === 0 ? "text-red-600" : "text-orange-600"}`}>
                    {v.stock === 0 ? "Habis" : `Sisa ${v.stock}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide">Pesanan terbaru</h2>
        {d.recentOrders.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">Belum ada pesanan.</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-200 text-sm">
            {d.recentOrders.map((o) => (
              <li key={o.orderNumber}>
                <Link
                  to={`/orders/${o.orderNumber}`}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 hover:bg-neutral-50"
                >
                  <span>
                    <span className="font-medium">{o.orderNumber}</span>
                    <span className="block text-xs text-neutral-500">
                      {o.recipient} &middot; {formatDateTime(o.createdAt)}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[o.status]}`}>
                      {STATUS_LABEL[o.status]}
                    </span>
                    <span className="font-semibold">{formatRupiah(o.total)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}