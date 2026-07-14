import { Agent, fetch as undiciFetch, type RequestInit as UndiciRequestInit } from "undici";

// api.oraculocrm.com.br apresenta um certificado TLS com CN inválido (confirmado
// com o suporte deles em 2026-07-14, ainda pendente do lado deles). O usuário
// autorizou explicitamente ignorar a verificação de certificado só nesta conexão
// até corrigirem — remover este agent e a env CRM_API_TLS_INSECURE assim que
// resolverem.
let cachedInsecureAgent: Agent | undefined;
function getInsecureAgent(): Agent | undefined {
  if (process.env.CRM_API_TLS_INSECURE !== "true") return undefined;
  if (!cachedInsecureAgent) cachedInsecureAgent = new Agent({ connect: { rejectUnauthorized: false } });
  return cachedInsecureAgent;
}

export class CrmApiError extends Error {
  constructor(public status: number, public path: string, body: string) {
    super(`CRM API ${path} -> ${status}: ${body}`);
  }
}

export async function crmFetch<T = unknown>(
  path: string,
  opts: {
    apiKey: string;
    method?: string;
    query?: Record<string, string | number | undefined>;
    body?: unknown;
  }
): Promise<T> {
  const baseUrl = process.env.CRM_API_BASE_URL;
  const apiKey = opts.apiKey;
  if (!baseUrl || !apiKey) throw new Error("CRM_API_BASE_URL não configurada ou apiKey ausente");

  const url = new URL(baseUrl.replace(/\/$/, "") + path);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const init: UndiciRequestInit = {
    method: opts.method ?? "GET",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
    },
    dispatcher: getInsecureAgent(),
  };
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body);

  const res = await undiciFetch(url, init);
  const text = await res.text();
  if (!res.ok) throw new CrmApiError(res.status, path, text);
  return text ? (JSON.parse(text) as T) : (undefined as T);
}
