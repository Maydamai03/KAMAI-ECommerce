import type { ReactNode } from "react";
import { useStoreInfo } from "../hooks/useStoreInfo";
import { usePageMeta } from "../hooks/usePageMeta";
import { SAMPLE_CONTENT, type Section } from "../content/pages";

interface Props {
  title: string;
  intro?: string;
  children: ReactNode;
}

export default function StaticPage({ title, intro, children }: Props) {
  const { data: store } = useStoreInfo();
  usePageMeta(`${title} | ${store?.name ?? "Kamai"}`, intro);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">{title}</h1>
      {intro && <p className="mt-3 text-neutral-600">{intro}</p>}

      <div className="mt-8">
        {SAMPLE_CONTENT && (
          <div role="note" className="mb-8 border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900">
            Isi halaman ini masih <strong>contoh</strong>. Ganti dengan informasi resmi di{" "}
            <code>src/content/pages.ts</code>, lalu ubah <code>SAMPLE_CONTENT</code> menjadi{" "}
            <code>false</code> untuk menyembunyikan pemberitahuan ini.
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function Sections({ sections }: { sections: Section[] }) {
  return (
    <div className="space-y-10">
      {sections.map((s) => (
        <section key={s.heading}>
          <h2 className="text-xl font-bold">{s.heading}</h2>
          {s.paragraphs?.map((p) => (
            <p key={p} className="mt-3 leading-relaxed text-neutral-700">
              {p}
            </p>
          ))}
          {s.bullets && (
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-neutral-700">
              {s.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}