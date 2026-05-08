// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const blockedTabs = ["Pagamentos", "Melhorias", "Conta"];
const blockedTitles = ["pagamentos", "melhorias", "conta", "assinatura", "cobrança", "cobranca", "plano atual", "funções", "funcoes"];

function isPanelRoute() {
  return window.location.pathname.includes("/painel/");
}

function slugFromUrl() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const index = parts.indexOf("painel");
  return parts[index + 1] || "master-barbearia";
}

function normalizeRole(role) {
  const value = String(role || "").trim().toLowerCase();
  if (["desenvolvedor", "developer", "platform", "plataforma"].includes(value)) return "desenvolvedor";
  if (["dono", "owner"].includes(value)) return "dono";
  if (["funcionario", "funcionário", "employee", "staff"].includes(value)) return "funcionario";
  return "sem_acesso";
}

function roleLabel(role) {
  if (role === "desenvolvedor") return "Desenvolvedor";
  if (role === "dono") return "Dono";
  if (role === "funcionario") return "Funcionário";
  return "Sem acesso";
}

function hide(element) {
  element.setAttribute("data-role-hidden", "true");
  element.style.display = "none";
}

function resetHidden() {
  document.querySelectorAll("[data-role-hidden='true']").forEach((element) => {
    element.removeAttribute("data-role-hidden");
    element.style.display = "";
  });
}

function addBadge(role, email) {
  if (!role || document.querySelector("[data-role-badge]")) return;
  const target = document.querySelector(".adminApp .hero, .adminApp header, .adminApp, main, #root");
  if (!target) return;
  const badge = document.createElement("div");
  badge.dataset.roleBadge = "true";
  badge.className = "roleBadge";
  badge.innerHTML = `<strong>${roleLabel(role)}</strong>${email ? `<span>${email}</span>` : ""}`;
  target.prepend(badge);
}

function applyFuncionarioRules() {
  document.querySelectorAll("button, a, [role='button']").forEach((element) => {
    const text = (element.textContent || "").replace(/\s+/g, " ").trim();
    if (blockedTabs.includes(text)) hide(element);
  });

  document.querySelectorAll(".card, .adminCard, section, article, .adminItem").forEach((element) => {
    const heading = (element.querySelector("h1,h2,h3,strong")?.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
    if (blockedTitles.some((title) => heading.includes(title))) hide(element);
  });

  document.querySelectorAll("input[name*='pix' i], input[placeholder*='pix' i]").forEach((input) => {
    input.disabled = true;
    const wrapper = input.closest(".adminItem, .field, label, div");
    if (wrapper) hide(wrapper);
  });
}

export default function NativeRolePermissions() {
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!isPanelRoute()) return;
    let cancelled = false;

    async function load() {
      try {
        const sessionResult = await supabase.auth.getSession();
        const sessionEmail = sessionResult?.data?.session?.user?.email || "";
        if (cancelled) return;
        setEmail(sessionEmail);
        if (!sessionEmail) return;

        const { data, error } = await supabase.rpc("get_my_barbershop_role", { target_slug: slugFromUrl() });
        if (cancelled || error) return;
        const row = Array.isArray(data) ? data[0] : data;
        const nextRole = normalizeRole(row?.role);
        setRole(nextRole);
        document.documentElement.dataset.agendaRole = nextRole;
      } catch (error) {
        console.warn("AgendaPro: falha ao carregar permissões.", error);
      }
    }

    load();
    const { data: listener } = supabase.auth.onAuthStateChange(() => load());

    return () => {
      cancelled = true;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!isPanelRoute() || !role) return;

    function apply() {
      resetHidden();
      addBadge(role, email);
      if (role === "funcionario") applyFuncionarioRules();
    }

    apply();
    const observer = new MutationObserver(() => window.requestAnimationFrame(apply));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [role, email]);

  return null;
}
