// @ts-nocheck
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

function slugFromUrl() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts[parts.indexOf("painel") + 1] || "master-barbearia";
}

export default function SafeServiceDelete() {
  const panel = window.location.pathname.includes("/painel/");
  const slug = slugFromUrl();
  const [services, setServices] = useState([]);
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    if (!panel) return;
    const { data, error } = await supabase
      .from("services")
      .select("id,name,price,duration,active,deleted_at")
      .is("deleted_at", null)
      .order("sort_order", { ascending: true });

    if (!error) setServices((data || []).filter((item) => item.name));
  }

  useEffect(() => { load(); }, [slug]);

  async function removeService(service) {
    if (!window.confirm(`Excluir o serviço "${service.name}"? O histórico antigo será mantido.`)) return;
    setSaving(service.id);
    setMessage("");
    try {
      const { error } = await supabase.rpc("soft_delete_service_by_name", {
        target_slug: slug,
        service_name_input: service.name,
      });
      if (error) throw error;
      setServices((current) => current.filter((item) => item.id !== service.id));
      setMessage("Serviço excluído com segurança.");
    } catch (error) {
      setMessage(error?.message || "Não foi possível excluir o serviço.");
    } finally {
      setSaving("");
    }
  }

  if (!panel) return null;

  return (
    <section className="safeFeaturePanel">
      <div className="safeFeatureHeader">
        <div>
          <span>AgendaPro PRO</span>
          <h2>Excluir serviço seguro</h2>
          <p>Remove o serviço da tela sem apagar agendamentos antigos.</p>
        </div>
      </div>
      {message ? <div className="safeFeatureNotice">{message}</div> : null}
      <div className="safeFeatureCard">
        {services.length ? services.map((service) => (
          <article className="safeFeatureRow" key={service.id}>
            <span>
              <strong>{service.name}</strong>
              <small>{service.duration} min · R$ {Number(service.price || 0).toFixed(2)}</small>
            </span>
            <button type="button" disabled={saving === service.id} onClick={() => removeService(service)}>
              {saving === service.id ? "Excluindo..." : "Excluir"}
            </button>
          </article>
        )) : <p>Nenhum serviço ativo encontrado.</p>}
      </div>
    </section>
  );
}
