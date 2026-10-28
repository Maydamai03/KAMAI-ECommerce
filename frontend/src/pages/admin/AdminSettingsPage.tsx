import { useQuery } from "@tanstack/react-query";
import { getAdminSettings } from "../../services/admin";
import ProfileForm from "../../components/admin/settings/ProfileForm";
import OriginForm from "../../components/admin/settings/OriginForm";
import ManualRatesEditor from "../../components/admin/settings/ManualRatesEditor";
import BannersEditor from "../../components/admin/settings/BannersEditor";
import LogoEditor from "../../components/admin/settings/LogoEditor";

export default function AdminSettingsPage() {
  const settings = useQuery({
    queryKey: ["admin-settings"],
    queryFn: getAdminSettings,
    staleTime: 0,
  });

  if (settings.isLoading) return <p className="text-sm text-neutral-500">Memuat pengaturan...</p>;

  if (settings.isError || !settings.data) {
    return (
      <p className="text-sm text-red-600">
        Gagal memuat pengaturan.{" "}
        <button type="button" onClick={() => settings.refetch()} className="underline">
          Coba lagi
        </button>
      </p>
    );
  }

  const s = settings.data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pengaturan toko</h1>
      <ProfileForm profile={s.profile} />
      <LogoEditor logoUrl={s.logoUrl} name={s.profile.name} />
      <BannersEditor />
      <OriginForm origin={s.origin} problem={s.originProblem} />
      <ManualRatesEditor initial={s.manual} manualError={s.manualError} provider={s.provider} />
    </div>
  );
}