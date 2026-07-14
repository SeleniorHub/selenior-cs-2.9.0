import { ReunioesPageClient } from "@/components/reunioes/ReunioesPageClient";
import { getActionItems, getClients, getCurrentProfile, getMeetings } from "@/lib/data/queries";

export default async function ReunioesPage() {
  const [meetings, clients, actionItems, profile] = await Promise.all([
    getMeetings(),
    getClients(),
    getActionItems(),
    getCurrentProfile(),
  ]);

  return (
    <ReunioesPageClient
      meetings={meetings}
      clients={clients}
      actionItems={actionItems}
      isAdmin={profile?.role === "admin"}
    />
  );
}
