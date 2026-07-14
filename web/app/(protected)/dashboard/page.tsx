import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { getDashboardData, getCurrentProfile } from "@/lib/data/queries";

export default async function DashboardPage() {
  const [{ clients, meetings, actionItems, mrrHistory }, profile] = await Promise.all([
    getDashboardData(),
    getCurrentProfile(),
  ]);

  return (
    <DashboardClient
      clients={clients}
      meetings={meetings}
      actionItems={actionItems}
      mrrHistory={mrrHistory}
      isAdmin={profile?.role === "admin"}
    />
  );
}
