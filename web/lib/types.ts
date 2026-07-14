export type Checkpoint = { id: string; texto: string; done: boolean; ordem: number };
export type MeetingPoint = { id: string; texto: string; ordem: number };

export type Client = {
  id: string;
  nome: string;
  nicho: string | null;
  fase: string;
  churn: string;
  status: string;
  mrr_bruto: string;
  custo_mensal: string;
  comissao_valor: string | null;
  comissao_tipo: string;
  indicador: string | null;
  nota_interna: string | null;
  depoimento: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  client_checkpoints?: Checkpoint[];
};

export type Meeting = {
  id: string;
  client_id: string;
  data: string;
  titulo: string | null;
  duracao: string | null;
  participantes: string | null;
  resumo: string | null;
  meeting_points?: MeetingPoint[];
};

export type Goal = {
  id: string;
  client_id: string;
  mes: string | null;
  titulo: string;
  status: string;
  progresso: string;
  total: string;
  unidade: string | null;
};

export type Objective = {
  id: string;
  client_id: string;
  texto: string;
  icone: string | null;
};

export type ActionItem = {
  id: string;
  client_id: string;
  meeting_id: string | null;
  texto: string;
  responsavel: string | null;
  data_prazo: string | null;
  concluido: boolean;
};

export type ClientDocument = {
  id: string;
  client_id: string;
  tipo: string;
  nome: string;
  storage_path: string | null;
  tamanho: number | null;
  uploaded_at: string;
};

export type MrrHistoryEntry = {
  id: string;
  client_id: string;
  mes: string;
  mrr: string;
};

export type Role = "admin" | "viewer";
