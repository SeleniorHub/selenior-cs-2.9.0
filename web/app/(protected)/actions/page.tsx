import { ActionsPageClient } from "@/components/actions/ActionsPageClient";
import { getActionItems, getClients, getCurrentProfile, getMeetings } from "@/lib/data/queries";

export default async function ActionsPage() {
  const [actionItems, clients, meetings, profile] = await Promise.all([
    getActionItems(),
    getClients(),
    getMeetings(),
    getCurrentProfile(),
  ]);

  return (
    <ActionsPageClient
      actionItems={actionItems}
      clients={clients}
      meetings={meetings}
      isAdmin={profile?.role === "admin"}
    />
  );
}
