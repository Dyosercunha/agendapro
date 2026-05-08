// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

function isPanelRoute() {
  return window.location.pathname.includes("/painel/");
}

function slugFromUrl() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const index = parts.indexOf("painel");
  return parts[index + 1] || "master-barbearia";
}

function readableRole(role) {
  if (role === "desenvolvedor") return "Desenvolvedor";
  if (role === "dono") return "Dono";
  if (role === "funcionario") return "Funcionário";
  return "Sem cargo";
}

function messageFromError(error) {
  return error?.message || error?.details || error?.hint || String(error || "Erro desconhecido.");
}

export default function NativeLoginGuard() {
  const [checking, setChecking] = useState(false);
  const [context, setContext] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isPanelRoute()) return;
    let cancelled = false;

    async function resolve() {
      setChecking(true);
      setError("");
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        if (!session?.user?.email) {
          setContext({ allowed: false, destination: "login", reason: "Entre com o Google para acessar este painel." });
          return;
        }

        const { data, error: rpcError } = await supabase.rpc("resolve_login_destination", {
          target_slug: slugFromUrl(),
        });

        if (rpcError) throw rpcError;
        if (cancelled) return;
        setContext(data || null);
      } catch (err) {
        if (cancelled) return;
        setError(messageFromError(err));
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    resolve();
    const { data: listener } = supabase.auth.onAuthStateChange(() => resolve());
    return () => {
      cancelled = true;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  if (!isPanelRoute()) return null;

  async function login() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href },
    });
  }

  async function logout() {
    await supabase.auth.signOut();
    setContext({ allowed: false, destination: "login", reason: "Você saiu do painel." });
  }

  if (checking && !context) {
    return (
      <div className="loginGuardOverlay">
        <div className="loginGuardCard">
          <span>AgendaPro</span>
          <h2>Validando acesso...</h2>
          <p>Conferindo login, cargo e permissão da barbearia.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loginGuardOverlay">
        <div className="loginGuardCard">
          <span>AgendaPro</span>
          <h2>Falha ao validar acesso</h2>
          <p>{error}</p>
          <button type="button" onClick={() => window.location.reload()}>Tentar novamente</button>
        </div>
      </div>
    );
  }

  if (context && context.allowed === false) {
    return (
      <div className="loginGuardOverlay">
        <div className="loginGuardCard">
          <span>AgendaPro</span>
          <h2>Acesso protegido</h2>
          <p>{context.reason || "Entre com uma conta autorizada para acessar este painel."}</p>
          <button type="button" onClick={login}>Entrar com Google</button>
        </div>
      </div>
    );
  }

  if (context?.allowed) {
    return (
      <div className="loginGuardBadge">
        <strong>{readableRole(context.role)}</strong>
        <span>{context.email}</span>
        <button type="button" onClick={logout}>Sair</button>
      </div>
    );
  }

  return null;
}
