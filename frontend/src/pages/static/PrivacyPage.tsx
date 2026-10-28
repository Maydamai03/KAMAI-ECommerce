import StaticPage, { Sections } from "../../components/StaticPage";
import { privacyIntro, privacySections } from "../../content/pages";
import { useStoreInfo } from "../../hooks/useStoreInfo";

export default function PrivacyPage() {
  const { data: store } = useStoreInfo();
  const name = store?.name ?? "Kamai";

  return (
    <StaticPage title="Privasi & Syarat" intro={privacyIntro}>
      <Sections sections={privacySections(name)} />
    </StaticPage>
  );
}