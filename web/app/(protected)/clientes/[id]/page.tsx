import { notFound } from "next/navigation";
import { ClientDetailClient } from "@/components/clients/ClientDetailClient";
import {
  getActionItems,
  getClient,
  getClients,
  getCurrentProfile,
  getDocuments,
  getGoals,
  getMeetings,
  getMrrHistory,
  getObjectives,
} from "@/lib/data/queries";

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [client, allClients, meetings, goals, objectives, actionItems, documents, mrrHistory, profile, allActionItems] =
    await Promise.all([
      getClient(id),
      getClients(),
      getMeetings(id),
      getGoals(id),
      getObjectives(id),
      getActionItems(id),
      getDocuments(id),
      getMrrHistory(id),
      getCurrentProfile(),
      getActionItems(),
    ]);

  if (!client) notFound();

  const allMeetings = await getMeetings();
  const clientIndex = allClients.findIndex((c) => c.id === id);

  return (
    <ClientDetailClient
      client={client}
      clientIndex={clientIndex}
      meetings={meetings}
      goals={goals}
      objectives={objectives}
      actionItems={actionItems}
      documents={documents}
      mrrHistory={mrrHistory}
      isAdmin={profile?.role === "admin"}
      allMeetings={allMeetings}
      allActionItems={allActionItems}
    />
  );
}
