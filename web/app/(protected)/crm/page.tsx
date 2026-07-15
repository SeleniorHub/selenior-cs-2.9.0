import { listClientsWithoutCrmAccount, listCrmAccountsWithClients } from "@/lib/data/crm-accounts";
import { getCrmFunnel, getCurrentProfile, getDailyAccountMetrics } from "@/lib/data/queries";
import { CrmPageClient } from "@/components/crm/CrmPageClient";

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const { account: accountParam } = await searchParams;
  const [accounts, profile] = await Promise.all([listCrmAccountsWithClients(), getCurrentProfile()]);
  const isAdmin = profile?.role === "admin";

  const selectedAccountId = accounts.find((a) => a.id === accountParam)?.id ?? accounts[0]?.id ?? null;
  const [funnel, metrics] = selectedAccountId
    ? await Promise.all([getCrmFunnel(selectedAccountId), getDailyAccountMetrics(selectedAccountId)])
    : [null, []];
  const clientsWithoutAccount = isAdmin ? await listClientsWithoutCrmAccount() : [];

  return (
    <CrmPageClient
      accounts={accounts}
      selectedAccountId={selectedAccountId}
      funnel={funnel}
      metrics={metrics}
      isAdmin={isAdmin}
      clientsWithoutAccount={clientsWithoutAccount}
    />
  );
}
