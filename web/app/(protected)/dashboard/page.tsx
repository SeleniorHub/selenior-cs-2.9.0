import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { getCrmFunnel, getDashboardData, getCurrentProfile } from "@/lib/data/queries";

export default async function DashboardPage() {
  const [{ clients, meetings, actionItems, mrrHistory }, profile, crmFunnel] = await Promise.all([
    getDashboardData(),
    getCurrentProfile(),
    getCrmFunnel(),
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
