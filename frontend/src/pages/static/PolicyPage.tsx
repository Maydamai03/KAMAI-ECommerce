import StaticPage, { Sections } from "../../components/StaticPage";
import { policyIntro, policySections } from "../../content/pages";
import { useStoreInfo } from "../../hooks/useStoreInfo";

export default function PolicyPage() {
  const { data: store } = useStoreInfo();
  const name = store?.name ?? "Kamai";

  return (
    <StaticPage title="Pengiriman & Retur" intro={policyIntro}>
      <Sections sections={policySections(name)} />
    </StaticPage>
  );
}