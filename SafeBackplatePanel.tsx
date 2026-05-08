// @ts-nocheck
import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

function routeSlug() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts[parts.indexOf("painel") + 1] || parts[parts.indexOf("agendamento") + 1] || "master-barbearia";
}
function inPanel() { return window.location.pathname.includes("/painel/"); }
function inClient() { return window.location.pathname.includes("/agendamento/"); }

export default function SafeBackplatePanel() {
  const slug = routeSlug();
  const panel = inPanel();
  const client = inClient();
  const [bg, setBg] = useState({ client_background_url: "", admin_background_url: "", client_background_opacity: 0.18, admin_background_opacity: 0.12 });
  const [txt, setTxt] = useState({ success_title: "Agendamento confirmado!", success_message: "Seu horário já está reservado.", success_footer: "A barbearia já recebeu os detalhes do atendimento." });
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const { data } = await supabase.from("barbershops").select("client_background_url,admin_background_url,client_background_opacity,admin_background_opacity,success_title,success_message,success_footer").eq("slug", slug).single();
    if (!data) return;
    setBg({
      client_background_url: data.client_background_url || "",
      admin_background_url: data.admin_background_url || "",
      client_background_opacity: data.client_background_opacity || 0.18,
      admin_background_opacity: data.admin_background_opacity || 0.12,
    });
    setTxt({
      success_title: data.success_title || "Agendamento confirmado!",
      success_message: data.success_message || "Seu horário já está reservado.",
      success_footer: data.success_footer || "A barbearia já recebeu os detalhes do atendimento.",
    });
  }

  useEffect(() => { load(); }, [slug]);
  useEffect(() => {
    let layer = document.getElementById("agendaProBackgroundLayer");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "agendaProBackgroundLayer";
      Object.assign(layer.style, { position: "fixed", inset: "0", zIndex: "-1", pointerEvents: "none", backgroundSize: "cover", backgroundPosition: "center" });
      document.body.prepend(layer);
      document.body.style.position = "relative";
    }
    const url = panel ? bg.admin_background_url : bg.client_background_url;
    const op = Number(panel ? bg.admin_background_opacity : bg.client_background_opacity) || 0;
    if (!url) { layer.style.opacity = "0"; layer.style.backgroundImage = "none"; return; }
    layer.style.opacity = String(Math.max(0, Math.min(op, 0.7)));
    layer.style.backgroundImage = `linear-gradient(rgba(7,10,13,.72),rgba(7,10,13,.72)), url('${String(url).replace(/'/g, "%27")}')`;
  }, [bg, panel]);

  function setBgField(key, value) { setBg((current) => ({ ...current, [key]: value })); }
  function setTxtField(key, value) { setTxt((current) => ({ ...current, [key]: value })); }

  async function saveBackground() {
    setSaving("background"); setMessage("");
    try {
      const { error } = await supabase.rpc("save_background_settings", {
        target_slug: slug,
        client_background_url_input: bg.client_background_url || "",
        admin_background_url_input: bg.admin_background_url || "",
        client_background_opacity_input: Number(bg.client_background_opacity || 0.18),
        admin_background_opacity_input: Number(bg.admin_background_opacity || 0.12),
      });
      if (error) throw error;
      setMessage("Backplate salvo.");
      await load();
    } catch (error) { setMessage(error?.message || "Não foi possível salvar o backplate."); }
    finally { setSaving(""); }
  }

  async function saveTexts() {
    setSaving("texts"); setMessage("");
    try {
      const { error } = await supabase.rpc("save_success_texts", { target_slug: slug, success_title_input: txt.success_title, success_message_input: txt.success_message, success_footer_input: txt.success_footer });
      if (error) throw error;
      setMessage("Textos salvos.");
    } catch (error) { setMessage(error?.message || "Não foi possível salvar os textos."); }
    finally { setSaving(""); }
  }

  if (client || !panel) return null;
  return <section className="safeFeaturePanel"><div className="safeFeatureHeader"><div><span>AgendaPro PRO</span><h2>Backplate e textos</h2><p>Plano de fundo do cliente, plano de fundo do painel e textos finais do agendamento.</p></div><a href={`/agendamento/${slug}`}>Ver tela do cliente</a></div>{message ? <div className="safeFeatureNotice">{message}</div> : null}<div className="safeFeatureGrid"><div className="safeFeatureCard"><h3>Backplate</h3><label>Fundo do cliente</label><input value={bg.client_background_url} onChange={(e) => setBgField("client_background_url", e.target.value)} placeholder="https://..."/><label>Opacidade cliente</label><input type="number" min="0" max="0.7" step="0.05" value={bg.client_background_opacity} onChange={(e) => setBgField("client_background_opacity", e.target.value)}/><label>Fundo do painel</label><input value={bg.admin_background_url} onChange={(e) => setBgField("admin_background_url", e.target.value)} placeholder="https://..."/><label>Opacidade painel</label><input type="number" min="0" max="0.7" step="0.05" value={bg.admin_background_opacity} onChange={(e) => setBgField("admin_background_opacity", e.target.value)}/><button type="button" onClick={() => setBgField("client_background_url", "")}>Limpar cliente</button><button type="button" onClick={() => setBgField("admin_background_url", "")}>Limpar painel</button><button type="button" disabled={saving === "background"} onClick={saveBackground}>{saving === "background" ? "Salvando..." : "Salvar backplate"}</button></div><div className="safeFeatureCard"><h3>Antes, processo e finalizado</h3><label>Antes</label><input value={txt.success_title} onChange={(e) => setTxtField("success_title", e.target.value)}/><label>Processo</label><textarea value={txt.success_message} onChange={(e) => setTxtField("success_message", e.target.value)}/><label>Finalizado</label><textarea value={txt.success_footer} onChange={(e) => setTxtField("success_footer", e.target.value)}/><button type="button" disabled={saving === "texts"} onClick={saveTexts}>{saving === "texts" ? "Salvando..." : "Salvar textos"}</button></div></div></section>;
}
