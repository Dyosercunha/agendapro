// @ts-nocheck
import { useEffect } from "react";

const roleTextReplacements = [
  [/\bPlataforma\b/g, "Desenvolvedor"],
  [/\bplatform\b/g, "desenvolvedor"],
  [/\bPlatform\b/g, "Desenvolvedor"],
  [/\bDeveloper\b/g, "Desenvolvedor"],
  [/\bdeveloper\b/g, "desenvolvedor"],
  [/\bGerente\b/g, "Funcionário"],
  [/\bgerente\b/g, "funcionário"],
  [/\bManager\b/g, "Funcionário"],
  [/\bmanager\b/g, "funcionário"],
  [/\bOwner\b/g, "Dono"],
  [/\bowner\b/g, "dono"],
];

function replaceRoleText(value = "") {
  return roleTextReplacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), String(value));
}

function shouldSkipElement(element) {
  if (!element) return true;
  return ["SCRIPT", "STYLE", "INPUT", "TEXTAREA"].includes(element.tagName);
}

function normalizeTextNodes() {
  if (!document.body) return;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (shouldSkipElement(parent)) return NodeFilter.FILTER_REJECT;
      const text = node.nodeValue || "";
      return /Plataforma|platform|Platform|Developer|developer|Gerente|gerente|Manager|manager|Owner|owner/.test(text)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const next = replaceRoleText(node.nodeValue || "");
    if (node.nodeValue !== next) node.nodeValue = next;
  });
}

function normalizeSelectLabelsOnly() {
  document.querySelectorAll("select").forEach((select) => {
    Array.from(select.options || []).forEach((option) => {
      const current = option.textContent || "";
      const next = replaceRoleText(current);
      if (current !== next) option.textContent = next;
    });
  });
}

export default function NativeSafeRoleLabels() {
  useEffect(() => {
    let scheduled = false;
    let stopped = false;

    function run() {
      if (stopped) return;
      scheduled = false;
      normalizeTextNodes();
      normalizeSelectLabelsOnly();
    }

    function scheduleRun() {
      if (scheduled || stopped) return;
      scheduled = true;
      window.setTimeout(run, 120);
    }

    run();

    const observer = new MutationObserver(scheduleRun);
    observer.observe(document.body, { childList: true, subtree: true });

    const interval = window.setInterval(run, 2000);

    return () => {
      stopped = true;
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
