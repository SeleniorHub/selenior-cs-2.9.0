import { getActionItems, getClients, getCurrentProfile, getMeetings } from "@/lib/data/queries";
import { ClientListClient } from "@/components/clients/ClientListClient";

export default async function ClientesPage() {
  const [clients, meetings, actionItems, profile] = await Promise.all([
    getClients(),
    getMeetings(),
    getActionItems(),
    getCurrentProfile(),
  ]);

  return (
    <ClientListClient
      clients={clients}
      meetings={meetings}
      actionItems={actionItems}
      isAdmin={profile?.role === "admin"}
    />
  );
}
