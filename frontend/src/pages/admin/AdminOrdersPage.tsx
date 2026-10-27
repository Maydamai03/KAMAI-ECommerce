import { Link, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getAdminOrders } from "../../services/admin";
import Pagination from "../../components/Pagination";
import { formatDateTime, formatRupiah } from "../../lib/format";
import { STATUS_LABEL, STATUS_STYLE } from "../../lib/orderStatus";
import type { OrderStatus } from "../../types";

const STATUSES: OrderStatus[] = [
  "PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "COMPLETED",
  "EXPIRED",
  "CANCELLED",
];

export default function AdminOrdersPage() {
  const [params, setParams] = useSearchParams();

  const q = params.get("q") ?? "";
  const rawStatus = params.get("status");
  const status = STATUSES.includes(rawStatus as OrderStatus) ? (rawStatus as OrderStatus) : undefined;
  const page = Math.max(1, Number(params.get("page")) || 1);

  function update(changes: Record<string, string | undefined>, resetPage = true) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (resetPage) next.delete("page");
    setParams(next);
  }

  const orders = useQuery({
    queryKey: ["admin-orders", { q, status, page }],
    queryFn: () => getAdminOrders({ q: q || undefined, status, page, limit: 15 }),
    placeholderData: keepPreviousData,
    staleTime: 0,
  });

  const counts = orders.data?.counts;
  const totalAll = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;
  const items = orders.data?.items ?? [];
  const pagination = orders.data?.pagination;

  const tab = (active: boolean) =>
    `whitespace-nowrap border px-3 py-1.5 text-sm ${
      active ? "border-black bg-black text-white" : "border-neutral-300 bg-white hover:border-black"
    }`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pesanan</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button type="button" onClick={() => update({ status: undefined })} className={tab(!status)}>
          Semua{counts ? ` (${totalAll})` : ""}
        </button>
        {STATUSES.map((s) => (
          <button key={s} type="button" onClick={() => update({ status: s })} className={tab(status === s)}>
            {STATUS_LABEL[s]}
            {counts ? ` (${counts[s]})` : ""}
          </button>
        ))}
      </div>

      <form
        className="flex max-w-xl gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const value = String(new FormData(e.currentTarget).get("q") ?? "").trim();
          update({ q: value || undefined });
        }}
      >
        <input
          key={q}
          name="q"
          defaultValue={q}
          placeholder="Cari nomor pesanan, email, atau nomor HP..."
          className="w-full border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
        />
        <button type="submit" className="bg-black px-4 py-2 text-sm font-medium text-white">
          Cari
        </button>
      </form>

      {orders.isLoading && <p className="text-sm text-neutral-500">Memuat pesanan...</p>}
      {orders.isError && <p className="text-sm text-red-600">Gagal memuat pesanan.</p>}

      <div
        className={`overflow-x-auto border border-neutral-200 bg-white ${
          orders.isPlaceholderData ? "opacity-60" : ""
        }`}
      >
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-3">Pesanan</th>
              <th className="px-4 py-3">Penerima</th>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Kurir / resi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.orderNumber} className="border-b border-neutral-100 align-top hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <Link to={`/admin/orders/${o.orderNumber}`} className="font-medium hover:underline">
                    {o.orderNumber}
                  </Link>
                  <p className="text-xs text-neutral-500">{formatDateTime(o.createdAt)}</p>
                </td>
                <td className="px-4 py-3">
                  {o.recipient}
                  <p className="text-xs text-neutral-500">{o.email ?? o.phone ?? ""}</p>
                </td>
                <td className="px-4 py-3">{o.itemCount}</td>
                <td className="px-4 py-3 font-medium">{formatRupiah(o.total)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[o.status]}`}>
                    {STATUS_LABEL[o.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-neutral-600">
                  {o.courier ?? "-"}
                  {o.trackingNumber && <p className="font-mono text-neutral-900">{o.trackingNumber}</p>}
                </td>
              </tr>
            ))}
            {!orders.isLoading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                  Tidak ada pesanan yang cocok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onChange={(next) => update({ page: next > 1 ? String(next) : undefined }, false)}
        />
      )}
    </div>
  );
}