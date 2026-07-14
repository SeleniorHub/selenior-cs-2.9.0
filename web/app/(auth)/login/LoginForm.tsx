"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [showError, setShowError] = useState(false);

  async function handleSubmit() {
    if (!email || !pwd) return;
    setLoading(true);
    setShowError(false);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
    if (error) {
      setShowError(true);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <>
      <div className={`login-error${showError ? " show" : ""}`}>
        E-mail ou senha incorretos.
      </div>
      <input
        className="login-input"
        type="email"
        placeholder="E-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
        }}
      />
      <input
        className="login-input"
        type="password"
        placeholder="Senha de acesso"
        value={pwd}
        onChange={(e) => setPwd(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
        }}
      />
      <button className="login-btn" disabled={loading} onClick={handleSubmit}>
        {loading ? "Verificando..." : "Entrar"}
      </button>
    </>
  );
}
