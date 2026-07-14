import { listClientsWithoutCrmAccount, listCrmAccountsWithClients } from "@/lib/data/crm-accounts";
import { getCrmFunnel, getCurrentProfile } from "@/lib/data/queries";
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
  const funnel = selectedAccountId ? await getCrmFunnel(selectedAccountId) : null;
  const clientsWithoutAccount = isAdmin ? await listClientsWithoutCrmAccount() : [];

  return (
    <CrmPageClient
      accounts={accounts}
      selectedAccountId={selectedAccountId}
      funnel={funnel}
      isAdmin={isAdmin}
      clientsWithoutAccount={clientsWithoutAccount}
    />
  );
}
