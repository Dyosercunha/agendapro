import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

function slugFromUrl() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts[parts.indexOf("painel") + 1] || parts[parts.indexOf("agendamento") + 1] || "master-barbearia";
}
function isPanel() { return window.location.pathname.includes("/painel/"); }
function isClient() { return window.location.pathname.includes("/agendamento/"); }
function todayIso() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function promoActive(s: Record<string, any>) { const t = todayIso(); return !!s.promotion_active && (!s.promotion_start_date || t >= s.promotion_start_date) && (!s.promotion_end_date || t <= s.promotion_end_date); }

export default function SafeGrowthPanel() {
  const slug = slugFromUrl();
  const panel = isPanel();
  const client = isClient();
  const [data, setData] = useState<Record<string, any>>({ promotion_active:false, promotion_title:"Promoção online", promotion_description:"", promotion_discount:10, promotion_start_date:"", promotion_end_date:"", loyalty_enabled:false, loyalty_reward_description:"", loyalty_visit_goal:5, loyalty_discount:20, instagram_url:"", google_client_login_enabled:false });
  const [waitlist, setWaitlist] = useState<Array<Record<string, any>>>([]);
  const [clients, setClients] = useState<Array<Record<string, any>>>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const shopReq = supabase.from("barbershops").select("promotion_active,promotion_title,promotion_description,promotion_discount,promotion_start_date,promotion_end_date,loyalty_enabled,loyalty_reward_description,loyalty_visit_goal,loyalty_discount,instagram_url,google_client_login_enabled").eq("slug", slug).single();
    const waitReq = supabase.rpc("get_admin_waitlist", { target_slug: slug });
    const clientsReq = supabase.rpc("get_loyalty_clients", { target_slug: slug });
    const [{data:shop}, {data:waiting}, {data:loyal}] = await Promise.all([shopReq, waitReq, clientsReq]);
    if (shop) setData((c) => ({ ...c, ...shop }));
    setWaitlist(waiting || []);
    setClients(loyal || []);
  }
  useEffect(() => { load(); }, [slug]);
  function setField(key: string, value: any) { setData((current) => ({ ...current, [key]: value })); }

  async function save() {
    setSaving(true); setMessage("");
    try {
      const { error } = await supabase.from("barbershops").update({
        promotion_active: !!data.promotion_active,
        promotion_title: data.promotion_title || "Promoção online",
        promotion_description: data.promotion_description || "",
        promotion_discount: Number(data.promotion_discount || 0),
        promotion_start_date: data.promotion_start_date || null,
        promotion_end_date: data.promotion_end_date || null,
        loyalty_enabled: !!data.loyalty_enabled,
        loyalty_reward_description: data.loyalty_reward_description || "",
        loyalty_visit_goal: Number(data.loyalty_visit_goal || 5),
        loyalty_discount: Number(data.loyalty_discount || 0),
        instagram_url: data.instagram_url || null,
        google_client_login_enabled: !!data.google_client_login_enabled,
      }).eq("slug", slug);
      if (error) throw error;
      setMessage("Promoções, fidelidade e canais salvos.");
      await load();
    } catch (error) {
      setMessage(error?.message || "Não foi possível salvar as melhorias.");
    } finally { setSaving(false); }
  }

  if (client) {
    const showPromo = promoActive(data);
    if (!showPromo && !data.loyalty_enabled && !data.instagram_url && !data.google_client_login_enabled) return null;
    return <section className="safeFeatureClientBanner">{showPromo ? <div><strong>{data.promotion_title}</strong><p>{data.promotion_description}</p>{Number(data.promotion_discount)>0 ? <span>{data.promotion_discount}% de desconto</span> : null}</div> : null}{data.loyalty_enabled ? <p>Fidelidade: {data.loyalty_reward_description}</p> : null}<div className="safeFeatureActions">{data.instagram_url ? <a href={data.instagram_url} target="_blank" rel="noreferrer">Abrir Instagram</a> : null}{data.google_client_login_enabled ? <span>Login Google do cliente ativo</span> : null}</div></section>;
  }
  if (!panel) return null;
  return <section className="safeFeaturePanel"><div className="safeFeatureHeader"><div><span>AgendaPro PRO</span><h2>Promoções, fidelidade e lista de espera</h2><p>Recursos para aumentar retorno dos clientes.</p></div></div>{message ? <div className="safeFeatureNotice">{message}</div> : null}<div className="safeFeatureGrid"><div className="safeFeatureCard"><h3>Promoções inteligentes</h3><label><input type="checkbox" checked={!!data.promotion_active} onChange={(e)=>setField("promotion_active", e.target.checked)}/> Promoção ativa</label><input value={data.promotion_title||""} onChange={(e)=>setField("promotion_title",e.target.value)} placeholder="Título da promoção"/><textarea value={data.promotion_description||""} onChange={(e)=>setField("promotion_description",e.target.value)} placeholder="Descrição da promoção"/><label>Desconto %</label><input type="number" value={data.promotion_discount||0} onChange={(e)=>setField("promotion_discount",e.target.value)}/><label>Início</label><input type="date" value={data.promotion_start_date||""} onChange={(e)=>setField("promotion_start_date",e.target.value)}/><label>Fim</label><input type="date" value={data.promotion_end_date||""} onChange={(e)=>setField("promotion_end_date",e.target.value)}/></div><div className="safeFeatureCard"><h3>Fidelidade</h3><label><input type="checkbox" checked={!!data.loyalty_enabled} onChange={(e)=>setField("loyalty_enabled", e.target.checked)}/> Fidelidade ativa</label><label>Meta de visitas</label><input type="number" value={data.loyalty_visit_goal||5} onChange={(e)=>setField("loyalty_visit_goal",e.target.value)}/><label>Desconto %</label><input type="number" value={data.loyalty_discount||0} onChange={(e)=>setField("loyalty_discount",e.target.value)}/><textarea value={data.loyalty_reward_description||""} onChange={(e)=>setField("loyalty_reward_description",e.target.value)} placeholder="Recompensa"/><div className="safeFeatureList">{clients.slice(0,5).map(c=><article className="safeFeatureRow" key={c.id||c.whatsapp}><span><strong>{c.name}</strong><small>{c.visit_count||0} visitas · {c.loyalty_points||0} pontos</small></span></article>)}</div></div><div className="safeFeatureCard"><h3>Lista de espera</h3>{waitlist.length ? waitlist.slice(0,8).map(w=><article className="safeFeatureRow" key={w.id}><span><strong>{w.client_name}</strong><small>{w.preferred_date || "Sem data"} · {w.service_text || "Serviço"}</small><small>{w.whatsapp}</small></span></article>) : <p>Nenhum cliente aguardando.</p>}</div><div className="safeFeatureCard"><h3>Instagram e Google</h3><input value={data.instagram_url||""} onChange={(e)=>setField("instagram_url",e.target.value)} placeholder="https://instagram.com/sua_barbearia"/><label><input type="checkbox" checked={!!data.google_client_login_enabled} onChange={(e)=>setField("google_client_login_enabled", e.target.checked)}/> Login Google do cliente</label><button type="button" disabled={saving} onClick={save}>{saving ? "Salvando..." : "Salvar melhorias PRO"}</button></div></div></section>;
}
