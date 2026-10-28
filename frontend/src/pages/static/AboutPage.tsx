import StaticPage, { Sections } from "../../components/StaticPage";
import { aboutIntro, aboutSections } from "../../content/pages";
import { useStoreInfo } from "../../hooks/useStoreInfo";

export default function AboutPage() {
  const { data: store } = useStoreInfo();
  const name = store?.name ?? "Kamai";

  return (
    <StaticPage title="Tentang Kami" intro={aboutIntro(name)}>
      <Sections sections={aboutSections(name)} />
    </StaticPage>
  );
}