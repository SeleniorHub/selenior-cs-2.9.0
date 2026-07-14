import { randomUUID } from "crypto";

// Workflows n8n criados via API pública precisam de `webhookId` (UUID) e
// `typeVersion: 2.1` explícitos no node de webhook, senão a URL de produção nunca é
// registrada de verdade (fica retornando 404 mesmo com o workflow "ativo") — bug
// descoberto e corrigido em 2026-07-14 no workflow da Selenior. Todo workflow novo
// criado por aqui já nasce com o fix aplicado.

export type CreateCrmWebhookWorkflowInput = {
  clientNome: string;
  webhookSlug: string;
  webhookSecret: string;
};

export async function createN8nCrmWebhookWorkflow(input: CreateCrmWebhookWorkflowInput): Promise<{ id: string }> {
  const base = process.env.N8N_BASE_URL;
  const apiKey = process.env.N8N_API_KEY;
  const appBaseUrl = process.env.APP_BASE_URL;
  if (!base || !apiKey || !appBaseUrl) {
    throw new Error("N8N_BASE_URL / N8N_API_KEY / APP_BASE_URL não configuradas");
  }

  const webhookPath = `${input.webhookSlug}-crm-events`;
  const targetUrl = `${appBaseUrl.replace(/\/$/, "")}/api/webhooks/n8n/${input.webhookSlug}`;

  const workflow = {
    name: `Selenior CS — Eventos do CRM (${input.clientNome})`,
    nodes: [
      {
        parameters: { httpMethod: "POST", path: webhookPath, responseMode: "responseNode", options: {} },
        type: "n8n-nodes-base.webhook",
        typeVersion: 2.1,
        position: [0, 0],
        id: randomUUID(),
        name: "CRM Webhook",
        webhookId: randomUUID(),
      },
      {
        parameters: {
          method: "POST",
          url: targetUrl,
          sendHeaders: true,
          headerParameters: { parameters: [{ name: "x-webhook-secret", value: input.webhookSecret }] },
          sendBody: true,
          specifyBody: "json",
          jsonBody: "={{ $json.body }}",
          options: {},
        },
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.2,
        position: [280, 0],
        id: randomUUID(),
        name: "Encaminhar pro Selenior CS",
        continueOnFail: true,
        onError: "continueRegularOutput",
      },
      {
        parameters: { respondWith: "json", responseBody: '={{ {"ok": true} }}', options: {} },
        type: "n8n-nodes-base.respondToWebhook",
        typeVersion: 1.4,
        position: [560, 0],
        id: randomUUID(),
        name: "Responder ao CRM",
      },
    ],
    connections: {
      "CRM Webhook": { main: [[{ node: "Encaminhar pro Selenior CS", type: "main", index: 0 }]] },
      "Encaminhar pro Selenior CS": { main: [[{ node: "Responder ao CRM", type: "main", index: 0 }]] },
    },
    settings: { executionOrder: "v1" },
  };

  const createRes = await fetch(`${base}/api/v1/workflows`, {
    method: "POST",
    headers: { "X-N8N-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(workflow),
  });
  if (!createRes.ok) throw new Error(`n8n create workflow -> ${createRes.status}: ${await createRes.text()}`);
  const created = await createRes.json();

  const activateRes = await fetch(`${base}/api/v1/workflows/${created.id}/activate`, {
    method: "POST",
    headers: { "X-N8N-API-KEY": apiKey },
  });
  if (!activateRes.ok) throw new Error(`n8n activate workflow -> ${activateRes.status}: ${await activateRes.text()}`);

  return { id: created.id as string };
}
