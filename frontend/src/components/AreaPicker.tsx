import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { searchAreas } from "../services/shipping";
import type { ShippingArea } from "../types";

interface Props {
  onSelect: (area: ShippingArea) => void;
  hasValue?: boolean;
}

export default function AreaPicker({ onSelect, hasValue }: Props) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);

  const trimmed = text.trim();
  const term = useDebouncedValue(trimmed, 400);
  const canSearch = term.length >= 3;

  const results = useQuery({
    queryKey: ["areas", term.toLowerCase()],
    queryFn: () => searchAreas(term),
    enabled: canSearch,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  function choose(area: ShippingArea) {
    onSelect(area);
    setText("");
    setOpen(false);
  }

  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <input
        id="area-search"
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="area-results"
        autoComplete="off"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={
          hasValue ? "Ketik untuk mengganti area..." : "Ketik nama kecamatan atau kota, mis. Gubeng"
        }
        className="w-full border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-black"
      />

      {open && trimmed.length > 0 && (
        <div
          id="area-results"
          role="listbox"
          // Menjaga fokus tetap di kolom ketik saat daftar diklik
          onMouseDown={(e) => e.preventDefault()}
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto border border-neutral-300 bg-white shadow"
        >
          {trimmed.length < 3 && (
            <p className="px-3 py-2 text-sm text-neutral-500">Ketik minimal 3 huruf.</p>
          )}
          {trimmed.length >= 3 && (results.isFetching || !canSearch) && (
            <p className="px-3 py-2 text-sm text-neutral-500">Mencari...</p>
          )}
          {canSearch && results.isError && (
            <p className="px-3 py-2 text-sm text-red-600">Gagal mencari area. Coba lagi.</p>
          )}
          {canSearch && !results.isFetching && results.data?.length === 0 && (
            <p className="px-3 py-2 text-sm text-neutral-500">
              Area tidak ditemukan. Coba nama kecamatan atau kota lain.
            </p>
          )}
          {canSearch &&
            results.data?.map((a) => (
              <button
                key={a.id}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => choose(a)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-100"
              >
                {a.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}