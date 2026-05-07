// @ts-nocheck
import { useEffect } from "react";
import { supabase } from "./supabaseClient";

const slugFromUrl = () => {
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts[parts.indexOf("agendamento") + 1] || parts[parts.indexOf("painel") + 1] || "master-barbearia";
};
const isPanel = () => window.location.pathname.includes("/painel");
const norm = (value) => String(value || "").trim().toLowerCase();

function serviceCards() {
  return Array.from(document.querySelectorAll(".adminItem")).filter((card) => {
    const text = card.textContent || "";
    return text.includes("Tempo") && text.includes("Preço") && card.querySelector("input");
  });
}

function serviceName(card) {
  return card.querySelector("input")?.value?.trim() || card.querySelector("strong")?.textContent?.trim() || "";
}

function appearanceCard() {
  return Array.from(document.querySelectorAll(".card")).find((card) => card.querySelector("h2")?.textContent?.includes("Aparência"));
}

function backgroundLayer() {
  let layer = document.getElementById("agendaProBackgroundLayer");
  if (layer) return layer;
  layer = document.createElement("div");
  layer.id = "agendaProBackgroundLayer";
  Object.assign(layer.style, {
    position: "fixed",
    inset: "0",
    zIndex: "-1",
    pointerEvents: "none",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  });
  document.body.prepend(layer);
  document.body.style.position = "relative";
  return layer;
}

export default function NativeBarberEnhancements() {
  useEffect(() => {
    let deleted = [];
    let background = {};

    const applyDeleted = () => {
      serviceCards().forEach((card) => {
        if (deleted.includes(norm(serviceName(card)))) card.style.display = "none";
      });
      Array.from(document.querySelectorAll("button.service")).forEach((button) => {
        const label = norm(button.querySelector("strong")?.textContent || button.textContent);
        if (deleted.some((item) => label.includes(item))) button.style.display = "none";
      });
    };

    const addDeleteButtons = () => {
      if (!isPanel()) return;
      serviceCards().forEach((card) => {
        if (card.querySelector("[data-agenda-delete-service]")) return;
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.agendaDeleteService = "true";
        button.className = "dangerButton agendaDeleteServiceButton";
        button.textContent = "Excluir serviço";
        button.addEventListener("click", async () => {
          const name = serviceName(card);
          if (!name || !window.confirm(`Excluir o serviço "${name}"? O histórico antigo será mantido.`)) return;
          button.disabled = true;
          button.textContent = "Excluindo...";
          const { error } = await supabase.rpc("soft_delete_service_by_name", {
            target_slug: slugFromUrl(),
            service_name_input: name,
          });
          if (error) {
            window.alert(error.message || "Não foi possível excluir o serviço.");
            button.disabled = false;
            button.textContent = "Excluir serviço";
            return;
          }
          deleted.push(norm(name));
          card.style.display = "none";
          window.alert("Serviço excluído.");
        });
        card.appendChild(button);
      });
    };

    const applyBackground = () => {
      const layer = backgroundLayer();
      const url = isPanel() ? background.admin_background_url : background.client_background_url;
      const opacity = Number(isPanel() ? background.admin_background_opacity : background.client_background_opacity) || 0;
      if (!url) {
        layer.style.backgroundImage = "none";
        layer.style.opacity = "0";
        return;
      }
      layer.style.backgroundImage = `linear-gradient(rgba(7,10,13,.72),rgba(7,10,13,.72)), url('${url}')`;
      layer.style.opacity = String(Math.max(0, Math.min(opacity, 0.7)));
    };

    const fillPanel = (panel) => {
      if (!panel) return;
      panel.querySelector("[data-client-bg]").value = background.client_background_url || "";
      panel.querySelector("[data-admin-bg]").value = background.admin_background_url || "";
      panel.querySelector("[data-client-op]").value = background.client_background_opacity ?? 0.18;
      panel.querySelector("[data-admin-op]").value = background.admin_background_opacity ?? 0.12;
    };

    const loadBackground = async () => {
      const { data } = await supabase
        .from("barbershops")
        .select("client_background_url,admin_background_url,client_background_opacity,admin_background_opacity")
        .eq("slug", slugFromUrl())
        .single();
      background = data || {};
      applyBackground();
      document.querySelectorAll("[data-bg-panel]").forEach(fillPanel);
    };

    const saveBackground = async (panel, overrides = {}) => {
      const payload = {
        target_slug: slugFromUrl(),
        client_background_url_input: overrides.clientUrl ?? panel.querySelector("[data-client-bg]").value.trim(),
        admin_background_url_input: overrides.adminUrl ?? panel.querySelector("[data-admin-bg]").value.trim(),
        client_background_opacity_input: Number(panel.querySelector("[data-client-op]").value || 0.18),
        admin_background_opacity_input: Number(panel.querySelector("[data-admin-op]").value || 0.12),
      };
      const { error } = await supabase.rpc("save_background_settings", payload);
      if (error) throw error;
      await loadBackground();
    };

    const addBackgroundPanel = () => {
      if (!isPanel()) return;
      const card = appearanceCard();
      if (!card || card.querySelector("[data-bg-panel]")) return;
      const panel = document.createElement("div");
      panel.className = "adminItem backgroundToolsPanel";
      panel.dataset.bgPanel = "true";
      panel.innerHTML = '<h3>Planos de fundo</h3><p>Use uma imagem JPG, PNG ou WebP hospedada online.</p><label>Fundo da tela do cliente</label><input data-client-bg placeholder="https://..." /><label>Intensidade no cliente</label><input data-client-op type="number" min="0" max="0.7" step="0.05" value="0.18" /><button type="button" data-clear-client-bg class="outline backgroundClearButton">Limpar fundo do cliente</button><label>Fundo do painel da barbearia</label><input data-admin-bg placeholder="https://..." /><label>Intensidade no painel</label><input data-admin-op type="number" min="0" max="0.7" step="0.05" value="0.12" /><button type="button" data-clear-admin-bg class="outline backgroundClearButton">Limpar fundo do painel</button><button type="button" data-save-bg>Salvar planos de fundo</button>';
      fillPanel(panel);
      panel.querySelector("[data-save-bg]").addEventListener("click", async () => {
        try { await saveBackground(panel); window.alert("Planos de fundo salvos."); }
        catch (error) { window.alert(error.message || "Não foi possível salvar os planos de fundo."); }
      });
      panel.querySelector("[data-clear-client-bg]").addEventListener("click", async () => {
        try { await saveBackground(panel, { clientUrl: "" }); window.alert("Fundo do cliente removido."); }
        catch (error) { window.alert(error.message || "Não foi possível limpar o fundo do cliente."); }
      });
      panel.querySelector("[data-clear-admin-bg]").addEventListener("click", async () => {
        try { await saveBackground(panel, { adminUrl: "" }); window.alert("Fundo do painel removido."); }
        catch (error) { window.alert(error.message || "Não foi possível limpar o fundo do painel."); }
      });
      card.appendChild(panel);
    };

    const run = () => { applyDeleted(); addDeleteButtons(); addBackgroundPanel(); };

    supabase.from("services").select("name, deleted_at").not("deleted_at", "is", null).then(({ data }) => {
      deleted = (data || []).map((item) => norm(item.name));
      applyDeleted();
    });
    loadBackground();
    run();

    const observer = new MutationObserver(() => window.requestAnimationFrame(run));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
