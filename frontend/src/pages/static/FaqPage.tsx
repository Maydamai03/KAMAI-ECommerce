import { Link } from "react-router-dom";
import StaticPage from "../../components/StaticPage";
import { faqItems } from "../../content/pages";
import { useStoreInfo } from "../../hooks/useStoreInfo";

export default function FaqPage() {
  const { data: store } = useStoreInfo();
  const name = store?.name ?? "Kamai";

  return (
    <StaticPage title="Pertanyaan Umum" intro="Jawaban untuk pertanyaan yang paling sering diajukan.">
      <div className="divide-y divide-neutral-200 border-y border-neutral-200">
        {faqItems(name).map((item) => (
          <details key={item.q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
              {item.q}
              <span aria-hidden="true" className="text-xl leading-none transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">{item.a}</p>
          </details>
        ))}
      </div>

      <p className="mt-8 text-sm text-neutral-600">
        Belum menemukan jawabannya?{" "}
        <Link to="/contact" className="font-medium underline">
          Hubungi kami
        </Link>
        .
      </p>
    </StaticPage>
  );
}