// @ts-nocheck
import { useEffect } from "react";

const labelMap = {
  Plataforma: "Desenvolvedor",
  platform: "desenvolvedor",
  Developer: "Desenvolvedor",
  developer: "desenvolvedor",
  Gerente: "Funcionário",
  gerente: "funcionario",
  Manager: "Funcionário",
  manager: "funcionario",
  owner: "dono",
  Owner: "Dono",
};

function normalizeTextLabel(text) {
  return String(text || "")
    .replace(/\bPlataforma\b/g, "Desenvolvedor")
    .replace(/\bGerente\b/g, "Funcionário")
    .replace(/\bManager\b/g, "Funcionário")
    .replace(/\bDeveloper\b/g, "Desenvolvedor")
    .replace(/\bOwner\b/g, "Dono");
}

function normalizeRoleValue(value) {
  const current = String(value || "").trim().toLowerCase();
  if (["platform", "plataforma", "developer", "desenvolvedor"].includes(current)) return "desenvolvedor";
  if (["owner", "dono"].includes(current)) return "dono";
  if (["manager", "gerente", "funcionario", "funcionário", "employee", "staff"].includes(current)) return "funcionario";
  return value;
}

function updateTextNodes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (["SCRIPT", "STYLE", "TEXTAREA", "INPUT"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      const value = node.nodeValue || "";
      return /Plataforma|Gerente|Manager|Developer|Owner/.test(value)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    node.nodeValue = normalizeTextLabel(node.nodeValue);
  });
}

function updateSelectOptions() {
  document.querySelectorAll("select").forEach((select) => {
    Array.from(select.options || []).forEach((option) => {
      const oldText = option.textContent || "";
      const oldValue = option.value || "";
      option.textContent = normalizeTextLabel(oldText);
      option.value = normalizeRoleValue(oldValue);
    });

    select.value = normalizeRoleValue(select.value);
  });
}

function updateRoleInputs() {
  document.querySelectorAll("input, textarea").forEach((input) => {
    if (input.matches("[type='email'], [type='tel'], [type='number'], [type='date'], [type='time'], [type='color']")) return;
    const value = input.value || "";
    if (/Plataforma|Gerente|Manager|Developer|Owner/.test(value)) {
      input.value = normalizeTextLabel(value);
    }
  });
}

export default function NativeRoleLabelNormalizer() {
  useEffect(() => {
    function normalize() {
      updateTextNodes(document.body);
      updateSelectOptions();
      updateRoleInputs();
    }

    normalize();
    const observer = new MutationObserver(() => window.requestAnimationFrame(normalize));
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
