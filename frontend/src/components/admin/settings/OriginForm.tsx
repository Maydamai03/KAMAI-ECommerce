import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import AreaPicker from "../../AreaPicker";
import { saveOrigin } from "../../../services/admin";
import { errorText } from "../../../lib/apiError";
import type { ShippingArea, StoreOrigin } from "../../../types";

interface Props {
  origin: StoreOrigin | null;
  problem: string | null;
}

interface Area {
  areaId: string;
  province: string;
  city: string;
  district: string;
}

const inputClass =
  "w-full border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black";
const PHONE = /^(\+62|62|0)8[0-9]{7,12}$/;

export default function OriginForm({ origin, problem }: Props) {
  const qc = useQueryClient();

  const [name, setName] = useState(origin?.name ?? "");
  const [address, setAddress] = useState(origin?.address ?? "");
  const [phone, setPhone] = useState(origin?.phone ?? "");
  const [postalCode, setPostalCode] = useState(origin?.postalCode ?? "");
  const [area, setArea] = useState<Area | null>(
    origin
      ? { areaId: origin.areaId, province: origin.province, city: origin.city, district: origin.district }
      : null
  );
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const save = useMutation({
    mutationFn: saveOrigin,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["shipping-rates"] });
    },
  });

  function pick(a: ShippingArea) {
    setArea({ areaId: a.id, province: a.province, city: a.city, district: a.district });
    if (a.postalCode) setPostalCode(a.postalCode);
  }

  async function submit() {
    setMessage(null);
    const problems: string[] = [];
    if (name.trim().length < 2) problems.push("Nama gudang minimal 2 karakter.");
    if (!area) problems.push("Cari dan pilih area gudang.");
    if (!/^\d{5}$/.test(postalCode.trim())) problems.push("Kode pos harus 5 digit.");
    if (address.trim().length < 5) problems.push("Alamat minimal 5 karakter.");
    if (phone.trim() && !PHONE.test(phone.trim())) problems.push("Nomor telepon tidak valid.");
    if (problems.length > 0 || !area) {
      setMessage({ type: "error", text: problems.join(" ") });
      return;
    }

    try {
      await save.mutateAsync({
        name: name.trim(),
        areaId: area.areaId,
        province: area.province,
        city: area.city,
        district: area.district,
        postalCode: postalCode.trim(),
        address: address.trim(),
        phone: phone.trim() || undefined,
      });
      setMessage({ type: "ok", text: "Alamat gudang disimpan. Zona ongkir langsung mengikutinya." });
    } catch (e) {
      setMessage({ type: "error", text: errorText(e) });
    }
  }

  return (
    <section className="space-y-4 border border-neutral-200 bg-white p-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide">Alamat gudang (asal pengiriman)</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Zona tarif &quot;satu kota&quot;, &quot;satu provinsi&quot;, dan &quot;satu pulau&quot; dihitung dari alamat ini.
        </p>
      </div>

      {problem && (
        <p role="alert" className="border border-orange-300 bg-orange-50 p-3 text-sm text-orange-900">
          {problem}
        </p>
      )}

      <div>
        <label htmlFor="origin-name" className="mb-1 block text-sm font-medium">Nama gudang / toko</label>
        <input id="origin-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </div>

      <div>
        <p className="mb-1 text-sm font-medium">Kecamatan / kota gudang</p>
        {area && (
          <p className="mb-2 border border-black px-3 py-2 text-sm">
            {"\u2713 "}
            {area.district}, {area.city}, {area.province}
          </p>
        )}
        <AreaPicker onSelect={pick} hasValue={Boolean(area)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="origin-postal" className="mb-1 block text-sm font-medium">Kode pos</label>
          <input
            id="origin-postal"
            inputMode="numeric"
            maxLength={5}
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="origin-phone" className="mb-1 block text-sm font-medium">
            Telepon <span className="font-normal text-neutral-400">(opsional)</span>
          </label>
          <input
            id="origin-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="origin-address" className="mb-1 block text-sm font-medium">Alamat lengkap</label>
        <textarea
          id="origin-address"
          rows={2}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className={inputClass}
        />
      </div>

      {message && (
        <p role={message.type === "error" ? "alert" : "status"} className={`text-sm ${message.type === "error" ? "text-red-600" : "text-green-700"}`}>
          {message.text}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={save.isPending}
        className="bg-black px-6 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {save.isPending ? "Menyimpan..." : "Simpan alamat gudang"}
      </button>
    </section>
  );
}