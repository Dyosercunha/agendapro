// @ts-nocheck
import { useEffect, useRef, useState } from "react";
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
  return "Acesso liberado";
}

function messageFromError(error) {
  return error?.message || error?.details || error?.hint || String(error || "Erro desconhecido.");
}

function withTimeout(promise, ms = 4500) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Tempo limite ao validar o acesso.")), ms)),
  ]);
}

export default function NativeLoginGuard() {
  const [checking, setChecking] = useState(false);
  const [context, setContext] = useState(null);
  const [error, setError] = useState("");
  const resolvingRef = useRef(false);

  useEffect(() => {
    if (!isPanelRoute()) return;
    let cancelled = false;

    async function resolve() {
      if (resolvingRef.current) return;
      resolvingRef.current = true;
      setChecking(true);
      setError("");

      try {
        const { data: sessionData } = await withTimeout(supabase.auth.getSession(), 3500);
        const session = sessionData?.session;

        if (!session?.user?.email) {
          if (!cancelled) {
            setContext({ allowed: false, destination: "login", reason: "Entre com o Google para acessar este painel." });
          }
          return;
        }

        const { data, error: rpcError } = await withTimeout(
          supabase.rpc("resolve_login_destination", { target_slug: slugFromUrl() }),
          4500
        );

        if (rpcError) throw rpcError;
        if (cancelled) return;

        setContext(data || {
          allowed: true,
          destination: "barbershop",
          role: "dono",
          email: session.user.email,
          reason: "Acesso liberado com sessão Google ativa.",
        });
      } catch (err) {
        if (cancelled) return;

        const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: null }));
        const email = sessionData?.session?.user?.email || "";

        if (email) {
          console.warn("AgendaPro: validação demorou ou falhou; liberando painel com sessão Google ativa.", err);
          setContext({
            allowed: true,
            destination: "barbershop",
            role: "dono",
            email,
            reason: "Acesso liberado com sessão Google ativa.",
          });
        } else {
          setError(messageFromError(err));
        }
      } finally {
        resolvingRef.current = false;
        if (!cancelled) setChecking(false);
      }
    }

    resolve();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (["SIGNED_IN", "SIGNED_OUT", "TOKEN_REFRESHED", "INITIAL_SESSION"].includes(event)) resolve();
    });

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
        <strong>{checking ? "Validando..." : readableRole(context.role)}</strong>
        <span>{context.email}</span>
        <button type="button" onClick={logout}>Sair</button>
      </div>
    );
  }

  return null;
}
