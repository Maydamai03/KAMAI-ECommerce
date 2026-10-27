import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addOrderNote, changeOrderStatus, getAdminOrder, updateShipment } from "../../services/admin";
import { ApiError } from "../../lib/api";
import { errorText } from "../../lib/apiError";
import { formatDateTime, formatRupiah } from "../../lib/format";
import { invalidateOrders } from "../../lib/invalidate";
import { STATUS_LABEL, STATUS_STYLE } from "../../lib/orderStatus";
import type { AdminOrderDetail, AdminOrderTarget } from "../../types";

const PAYMENT_LABEL: Record<AdminOrderDetail["payments"][number]["status"], string> = {
  PENDING: "Menunggu",
  SETTLEMENT: "Lunas",
  FAILED: "Gagal",
  EXPIRED: "Kedaluwarsa",
  CANCELLED: "Dibatalkan",
};

const inputClass =
  "w-full border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black";

export default function AdminOrderDetailPage() {
  const { orderNumber = "" } = useParams();
  const qc = useQueryClient();

  const order = useQuery({
    queryKey: ["admin-order", orderNumber],
    queryFn: () => getAdminOrder(orderNumber),
    staleTime: 0,
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 1,
  });

  const [mode, setMode] = useState<"ship" | "cancel" | null>(null);
  const [tracking, setTracking] = useState("");
  const [courier, setCourier] = useState("");
  const [reason, setReason] = useState("");
  const [noteText, setNoteText] = useState("");
  const [editTracking, setEditTracking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function apply(data: AdminOrderDetail) {
    qc.setQueryData(["admin-order", orderNumber], data);
    invalidateOrders(qc);
  }

  const statusMutation = useMutation({
    mutationFn: (body: Parameters<typeof changeOrderStatus>[1]) => changeOrderStatus(orderNumber, body),
    onSuccess: apply,
  });
  const noteMutation = useMutation({
    mutationFn: (note: string) => addOrderNote(orderNumber, note),
    onSuccess: apply,
  });
  const shipmentMutation = useMutation({
    mutationFn: (trackingNumber: string) => updateShipment(orderNumber, { trackingNumber }),
    onSuccess: apply,
  });

  const busy = statusMutation.isPending || noteMutation.isPending || shipmentMutation.isPending;

  async function runStatus(body: Parameters<typeof changeOrderStatus>[1], successText: string) {
    setError(null);
    setInfo(null);
    try {
      await statusMutation.mutateAsync(body);
      setMode(null);
      setTracking("");
      setCourier("");
      setReason("");
      setInfo(successText);
    } catch (e) {
      setError(errorText(e));
      // Status mungkin sudah berubah (mis. diubah admin lain): muat ulang
      if (e instanceof ApiError && e.status === 409) void order.refetch();
    }
  }

  if (order.isLoading) return <p className="text-sm text-neutral-500">Memuat pesanan...</p>;

  if (order.isError || !order.data) {
    const notFound = order.error instanceof ApiError && order.error.status === 404;
    return (
      <div className="space-y-3 text-sm">
        <p className="text-red-600">{notFound ? "Pesanan tidak ditemukan." : "Gagal memuat pesanan."}</p>
        <Link to="/admin/orders" className="underline">
          Kembali ke daftar pesanan
        </Link>
      </div>
    );
  }

  const o = order.data;
  const a = o.address;
  const can = (t: AdminOrderTarget) => o.nextStatuses.includes(t);
  const courierName = [o.courierCompany, o.courierService].filter(Boolean).join(" ");

  function confirmAndProcess() {
    if (!window.confirm("Tandai pesanan ini sebagai sedang diproses?")) return;
    void runStatus({ status: "PROCESSING" }, "Pesanan ditandai sedang diproses.");
  }

  function confirmAndComplete() {
    if (!window.confirm("Tandai pesanan ini sebagai selesai?")) return;
    void runStatus({ status: "COMPLETED" }, "Pesanan ditandai selesai.");
  }

  function submitShip() {
    if (tracking.trim().length < 3) {
      setError("Nomor resi wajib diisi (minimal 3 karakter).");
      return;
    }
    if (!window.confirm("Tandai sebagai dikirim? Email pemberitahuan akan dikirim ke pembeli.")) return;
    void runStatus(
      {
        status: "SHIPPED",
        trackingNumber: tracking.trim(),
        courier: !o.courierCompany && courier.trim() ? courier.trim() : undefined,
      },
      "Pesanan ditandai dikirim. Email pemberitahuan dikirim ke pembeli."
    );
  }

  function submitCancel() {
    if (reason.trim().length < 3) {
      setError("Alasan pembatalan wajib diisi (minimal 3 karakter).");
      return;
    }
    const message = o.paymentSettled
      ? "Pesanan ini SUDAH DIBAYAR. Stok akan dikembalikan, tetapi uang pembeli TIDAK dikembalikan otomatis: kamu harus melakukan refund lewat dashboard Midtrans. Lanjutkan pembatalan?"
      : "Batalkan pesanan ini? Stok akan dikembalikan.";
    if (!window.confirm(message)) return;
    void runStatus({ status: "CANCELLED", note: reason.trim() }, "Pesanan dibatalkan.");
  }

  async function submitNote() {
    if (noteText.trim().length < 2) return;
    setError(null);
    setInfo(null);
    try {
      await noteMutation.mutateAsync(noteText.trim());
      setNoteText("");
    } catch (e) {
      setError(errorText(e));
    }
  }

  async function saveTracking() {
    if (editTracking === null) return;
    setError(null);
    setInfo(null);
    try {
      await shipmentMutation.mutateAsync(editTracking.trim());
      setEditTracking(null);
      setInfo("Nomor resi diperbarui.");
    } catch (e) {
      setError(errorText(e));
    }
  }

  const section = "border border-neutral-200 bg-white p-4";
  const heading = "text-sm font-semibold uppercase tracking-wide";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/admin/orders" className="text-sm text-neutral-500 underline">
            &larr; Semua pesanan
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{o.orderNumber}</h1>
          <p className="text-sm text-neutral-500">Dibuat {formatDateTime(o.createdAt)}</p>
        </div>
        <span className={`px-3 py-1 text-sm font-medium ${STATUS_STYLE[o.status]}`}>{STATUS_LABEL[o.status]}</span>
      </div>

      {o.refundNeeded && (
        <div role="alert" className="border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">Perlu refund manual</p>
          <p className="mt-1">
            Pesanan ini dibatalkan setelah pembayaran diterima. Kembalikan dana sebesar{" "}
            {formatRupiah(o.total)} lewat dashboard Midtrans. Sistem tidak melakukannya otomatis.
          </p>
        </div>
      )}

            {o.status === "PENDING" && o.payments.some((p) => p.fraudStatus === "challenge") && (
        <div role="alert" className="border border-orange-300 bg-orange-50 p-4 text-sm text-orange-900">
          <p className="font-semibold">Pembayaran ditinjau oleh sistem anti-fraud Midtrans</p>
          <p className="mt-1">
            Transaksi ini ditandai &quot;challenge&quot;. Pesanan tetap menunggu sampai kamu menerima (Accept)
            atau menolak (Deny) transaksinya di dashboard Midtrans. Setelah diterima, Midtrans mengirim
            pemberitahuan baru dan status di sini berubah otomatis.
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {info && (
        <p role="status" className="text-sm text-green-700">
          {info}
        </p>
      )}

      {/* Tindakan */}
      <section className={section}>
        <h2 className={heading}>Tindakan</h2>

        {o.nextStatuses.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">Tidak ada tindakan untuk status ini.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-3">
            {can("PROCESSING") && (
              <button
                type="button"
                onClick={confirmAndProcess}
                disabled={busy}
                className="bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                Tandai diproses
              </button>
            )}
            {can("SHIPPED") && (
              <button
                type="button"
                onClick={() => setMode(mode === "ship" ? null : "ship")}
                disabled={busy}
                className="bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                Tandai dikirim
              </button>
            )}
            {can("COMPLETED") && (
              <button
                type="button"
                onClick={confirmAndComplete}
                disabled={busy}
                className="bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                Tandai selesai
              </button>
            )}
            {can("CANCELLED") && (
              <button
                type="button"
                onClick={() => setMode(mode === "cancel" ? null : "cancel")}
                disabled={busy}
                className="border border-red-600 px-5 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Batalkan pesanan
              </button>
            )}
          </div>
        )}

        {mode === "ship" && can("SHIPPED") && (
          <div className="mt-4 space-y-3 border-t border-neutral-200 pt-4">
            <div>
              <label htmlFor="tracking" className="mb-1 block text-sm font-medium">
                Nomor resi
              </label>
              <input
                id="tracking"
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                placeholder="Contoh: JNE1234567890"
                className={inputClass}
              />
            </div>
            {!o.courierCompany && (
              <div>
                <label htmlFor="courier" className="mb-1 block text-sm font-medium">
                  Kurir <span className="font-normal text-neutral-400">(pesanan ini belum mencatat kurir)</span>
                </label>
                <input
                  id="courier"
                  value={courier}
                  onChange={(e) => setCourier(e.target.value)}
                  placeholder="Contoh: JNE REG"
                  className={inputClass}
                />
              </div>
            )}
            <p className="text-xs text-neutral-500">Pembeli akan menerima email berisi nomor resi ini.</p>
            <button
              type="button"
              onClick={submitShip}
              disabled={busy}
              className="bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {busy ? "Menyimpan..." : "Simpan dan kirim email"}
            </button>
          </div>
        )}

        {mode === "cancel" && can("CANCELLED") && (
          <div className="mt-4 space-y-3 border-t border-neutral-200 pt-4">
            <div>
              <label htmlFor="reason" className="mb-1 block text-sm font-medium">
                Alasan pembatalan
              </label>
              <textarea
                id="reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={inputClass}
              />
            </div>
            <p className="text-xs text-neutral-600">
              Stok akan dikembalikan.{" "}
              {o.paymentSettled
                ? "Pesanan ini sudah dibayar, jadi refund harus dilakukan manual lewat dashboard Midtrans."
                : ""}
            </p>
            <button
              type="button"
              onClick={submitCancel}
              disabled={busy}
              className="bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {busy ? "Memproses..." : "Konfirmasi pembatalan"}
            </button>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={section}>
          <h2 className={heading}>Penerima</h2>
          <p className="mt-3 text-sm font-medium">
            {a.recipientName} &middot; {a.phone}
          </p>
          {o.email && <p className="text-sm text-neutral-500">{o.email}</p>}
          <p className="mt-2 text-sm">{a.street}</p>
          <p className="text-sm text-neutral-600">
            {a.district}, {a.city}, {a.province} {a.postalCode}
          </p>
          {a.note && <p className="mt-1 text-xs text-neutral-500">Catatan kurir: {a.note}</p>}
          <p className="mt-3 text-xs text-neutral-500">
            {o.customer ? `Akun: ${o.customer.name} (${o.customer.email})` : "Pembeli tamu (tanpa akun)"}
          </p>
          {o.customerNotes && <p className="mt-1 text-xs text-neutral-500">Catatan pembeli: {o.customerNotes}</p>}
        </section>

        <section className={section}>
          <h2 className={heading}>Pengiriman</h2>
          <p className="mt-3 text-sm">Kurir pilihan: {courierName || "-"}</p>
          {o.shipment ? (
            <div className="mt-3 text-sm">
              <p>
                Dikirim {o.shipment.shippedAt ? formatDateTime(o.shipment.shippedAt) : "-"} lewat {o.shipment.courier}
              </p>
              {editTracking === null ? (
                <p className="mt-1">
                  Nomor resi: <span className="font-mono font-medium">{o.shipment.trackingNumber}</span>{" "}
                  <button
                    type="button"
                    onClick={() => setEditTracking(o.shipment?.trackingNumber ?? "")}
                    className="ml-2 text-xs underline"
                  >
                    Ubah
                  </button>
                </p>
              ) : (
                <div className="mt-2 flex gap-2">
                  <input
                    value={editTracking}
                    onChange={(e) => setEditTracking(e.target.value)}
                    className={inputClass}
                    aria-label="Nomor resi"
                  />
                  <button
                    type="button"
                    onClick={saveTracking}
                    disabled={busy}
                    className="bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
                  >
                    Simpan
                  </button>
                  <button type="button" onClick={() => setEditTracking(null)} className="px-2 text-sm underline">
                    Batal
                  </button>
                </div>
              )}
              {o.shipment.deliveredAt && (
                <p className="mt-1 text-neutral-500">Selesai {formatDateTime(o.shipment.deliveredAt)}</p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-neutral-500">Belum dikirim.</p>
          )}
        </section>
      </div>

      <section className={section}>
        <h2 className={heading}>Produk</h2>
        <ul className="mt-3 divide-y divide-neutral-200 text-sm">
          {o.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-4 py-3">
              <span>
                {i.productName}
                <span className="block text-xs text-neutral-500">
                  {i.variantLabel} &times; {i.quantity} @ {formatRupiah(i.unitPrice)}
                </span>
              </span>
              <span>{formatRupiah(i.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t border-neutral-200 pt-3 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatRupiah(o.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Ongkos kirim</span>
            <span>{formatRupiah(o.shippingCost)}</span>
          </div>
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span>{formatRupiah(o.total)}</span>
          </div>
        </div>
      </section>

      <section className={section}>
        <h2 className={heading}>Pembayaran</h2>
        {o.payments.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">Belum ada transaksi pembayaran.</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-200 text-sm">
            {o.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2 py-3">
                <span>
                  {p.status === "PENDING" && p.fraudStatus === "challenge"
                    ? "Ditinjau (challenge)"
                    : PAYMENT_LABEL[p.status]}
                  {p.method ? ` · ${p.method}` : ""}
                  {p.paidAt && <span className="block text-xs text-neutral-500">{formatDateTime(p.paidAt)}</span>}
                </span>
                <span className="font-medium">{formatRupiah(p.grossAmount)}</span>
              </li>
            ))}
          </ul>
        )}
        {o.status === "PENDING" && (
          <p className="mt-2 text-xs text-neutral-500">Batas waktu pembayaran: {formatDateTime(o.expiresAt)}</p>
        )}
      </section>

      <section className={section}>
        <h2 className={heading}>Catatan dan riwayat</h2>

        <div className="mt-3 flex gap-2">
          <input
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Tambah catatan internal (tidak terlihat pembeli)"
            className={inputClass}
            aria-label="Catatan internal"
          />
          <button
            type="button"
            onClick={submitNote}
            disabled={busy || noteText.trim().length < 2}
            className="bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            Tambah
          </button>
        </div>

        <ol className="mt-4 space-y-3 border-l border-neutral-200 pl-4 text-sm">
          {[...o.history].reverse().map((h) => (
            <li key={h.id}>
              <p className="font-medium">
                {h.fromStatus === h.toStatus ? "Catatan" : STATUS_LABEL[h.toStatus]}
                {h.fromStatus && h.fromStatus !== h.toStatus && (
                  <span className="ml-2 text-xs font-normal text-neutral-500">dari {STATUS_LABEL[h.fromStatus]}</span>
                )}
              </p>
              {h.note && (
                <p className={`mt-0.5 ${h.note.startsWith("PERLU REFUND") ? "font-medium text-red-700" : "text-neutral-700"}`}>
                  {h.note}
                </p>
              )}
              <p className="text-xs text-neutral-500">
                {formatDateTime(h.createdAt)} &middot; {h.actor ?? "Sistem"}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}