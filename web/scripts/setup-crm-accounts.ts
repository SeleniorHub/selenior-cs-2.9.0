import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

// Script de finalização da migração 0003: cria a conta CRM "própria" da Selenior
// (usando as credenciais que já estavam em .env.local), vincula a ela todos os
// registros de crm_pipelines/crm_pipeline_steps/crm_deals/daily_funnel_snapshot que
// ainda não têm account_id (dados pré-existentes, de antes de existir o conceito de
// conta), e então finaliza as constraints (NOT NULL + unique composta por conta).
// Idempotente: pode rodar de novo sem duplicar a conta nem quebrar se as constraints
// já tiverem sido aplicadas.

async function main() {
  const connectionString = process.env.DIRECT_URL;
  if (!connectionString) throw new Error("DIRECT_URL não definida no .env.local");
  const apiKey = process.env.CRM_API_KEY;
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
  if (!apiKey || !webhookSecret) throw new Error("CRM_API_KEY / N8N_WEBHOOK_SECRET não definidas no .env.local");

  const sql = postgres(connectionString, { ssl: "require" });

  const [account] = await sql`
    insert into crm_accounts (client_id, nome, api_key, webhook_slug, webhook_secret, ativo)
    values (null, 'Selenior (interno)', ${apiKey}, 'selenior', ${webhookSecret}, true)
    on conflict (webhook_slug) do update set nome = excluded.nome
    returning id
  `;
  console.log("Conta Selenior:", account.id);

  const backfillTables = [
    "crm_pipelines",
    "crm_pipeline_steps",
    "crm_deals",
    "daily_funnel_snapshot",
  ] as const;

  for (const table of backfillTables) {
    const result = await sql.unsafe(
      `update ${table} set account_id = $1 where account_id is null`,
      [account.id]
    );
    console.log(`Backfill ${table}: ${result.count} linhas`);
  }

  const finalizations: { check: string; statements: string[] }[] = [
    {
      check: `select is_nullable from information_schema.columns where table_name='crm_pipelines' and column_name='account_id'`,
      statements: [
        `alter table crm_pipelines alter column account_id set not null`,
        `alter table crm_pipelines drop constraint if exists crm_pipelines_crm_pipeline_id_unique`,
      ],
    },
    {
      check: `select is_nullable from information_schema.columns where table_name='crm_pipeline_steps' and column_name='account_id'`,
      statements: [
        `alter table crm_pipeline_steps alter column account_id set not null`,
        `alter table crm_pipeline_steps drop constraint if exists crm_pipeline_steps_crm_step_id_unique`,
      ],
    },
    {
      check: `select is_nullable from information_schema.columns where table_name='crm_deals' and column_name='account_id'`,
      statements: [
        `alter table crm_deals alter column account_id set not null`,
        `alter table crm_deals drop constraint if exists crm_deals_crm_deal_id_unique`,
      ],
    },
    {
      check: `select is_nullable from information_schema.columns where table_name='daily_funnel_snapshot' and column_name='account_id'`,
      statements: [
        `alter table daily_funnel_snapshot alter column account_id set not null`,
        `alter table daily_funnel_snapshot drop constraint if exists daily_funnel_snapshot_unique`,
      ],
    },
  ];

  for (const { check, statements } of finalizations) {
    const [col] = await sql.unsafe(check);
    if (col?.is_nullable === "NO") {
      console.log(`(já finalizado, pulando) ${statements[0].split(" ")[2]}`);
      continue;
    }
    for (const stmt of statements) {
      await sql.unsafe(stmt);
    }
  }

  await sql.unsafe(`
    do $$ begin
      if not exists (
        select 1 from pg_constraint where conname = 'crm_pipelines_account_unique'
      ) then
        alter table crm_pipelines add constraint crm_pipelines_account_unique unique (account_id, crm_pipeline_id);
      end if;
      if not exists (
        select 1 from pg_constraint where conname = 'crm_pipeline_steps_account_unique'
      ) then
        alter table crm_pipeline_steps add constraint crm_pipeline_steps_account_unique unique (account_id, crm_step_id);
      end if;
      if not exists (
        select 1 from pg_constraint where conname = 'crm_deals_account_unique'
      ) then
        alter table crm_deals add constraint crm_deals_account_unique unique (account_id, crm_deal_id);
      end if;
      if not exists (
        select 1 from pg_constraint where conname = 'daily_funnel_snapshot_unique'
      ) then
        alter table daily_funnel_snapshot add constraint daily_funnel_snapshot_unique unique (account_id, data, pipeline_id, step_id);
      end if;
    end $$;
  `);

  console.log("Constraints finalizadas.");
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
