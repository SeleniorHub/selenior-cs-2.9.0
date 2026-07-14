import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { PrivacyProvider } from "@/components/providers/PrivacyProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, nome")
    .eq("id", user.id)
    .single();

  const role: "admin" | "viewer" = profile?.role === "admin" ? "admin" : "viewer";

  return (
    <ThemeProvider>
      <PrivacyProvider role={role}>
        <ToastProvider>
          <AppShell role={role} email={user.email ?? ""}>
            {children}
          </AppShell>
        </ToastProvider>
      </PrivacyProvider>
    </ThemeProvider>
  );
}
