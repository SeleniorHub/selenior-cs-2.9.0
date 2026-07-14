import { createClient } from "@/lib/supabase/server";
import type {
  ActionItem,
  Client,
  ClientDocument,
  Goal,
  Meeting,
  MrrHistoryEntry,
  Objective,
} from "@/lib/types";

export async function getClients(): Promise<Client[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*, client_checkpoints(*)")
    .order("nome");
  if (error) throw error;
  return (data ?? []) as unknown as Client[];
}

export async function getClient(id: string): Promise<Client | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*, client_checkpoints(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Client | null;
}

export async function getMeetings(clientId?: string): Promise<Meeting[]> {
  const supabase = await createClient();
  let query = supabase.from("meetings").select("*, meeting_points(*)").order("data", { ascending: false });
  if (clientId) query = query.eq("client_id", clientId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Meeting[];
}

export async function getMeeting(id: string): Promise<Meeting | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select("*, meeting_points(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Meeting | null;
}

export async function getGoals(clientId: string): Promise<Goal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("goals").select("*").eq("client_id", clientId);
  if (error) throw error;
  return (data ?? []) as Goal[];
}

export async function getObjectives(clientId: string): Promise<Objective[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("objectives").select("*").eq("client_id", clientId);
  if (error) throw error;
  return (data ?? []) as Objective[];
}

export async function getActionItems(clientId?: string): Promise<ActionItem[]> {
  const supabase = await createClient();
  let query = supabase.from("action_items").select("*");
  if (clientId) query = query.eq("client_id", clientId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ActionItem[];
}

export async function getDocuments(clientId: string): Promise<ClientDocument[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("client_id", clientId)
    .order("uploaded_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ClientDocument[];
}

export async function getMrrHistory(clientId?: string): Promise<MrrHistoryEntry[]> {
  const supabase = await createClient();
  let query = supabase.from("mrr_history").select("*").order("mes");
  if (clientId) query = query.eq("client_id", clientId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as MrrHistoryEntry[];
}

export async function getDashboardData() {
  const [clients, meetings, actionItems, mrrHistory] = await Promise.all([
    getClients(),
    getMeetings(),
    getActionItems(),
    getMrrHistory(),
  ]);
  return { clients, meetings, actionItems, mrrHistory };
}

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role, nome").eq("id", user.id).single();
  return { user, role: (profile?.role as "admin" | "viewer") ?? "viewer", nome: profile?.nome as string | undefined };
}
