import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { getCrmAccountBySlug } from "@/lib/data/crm-accounts";
import { getCrmFunnel, getDashboardData, getCurrentProfile } from "@/lib/data/queries";

export default async function DashboardPage() {
  const seleniorAccount = await getCrmAccountBySlug("selenior");
  const [{ clients, meetings, actionItems, mrrHistory }, profile, crmFunnel] = await Promise.all([
    getDashboardData(),
    getCurrentProfile(),
    seleniorAccount ? getCrmFunnel(seleniorAccount.id) : Promise.resolve({ pipelines: [], steps: [], deals: [] }),
  ]);

  return (
    <DashboardClient
      clients={clients}
      meetings={meetings}
      actionItems={actionItems}
      mrrHistory={mrrHistory}
      isAdmin={profile?.role === "admin"}
      crmFunnel={crmFunnel}
    />
  );
}
