import React, { useState } from "react";

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export default function LandingPage() {
  const [slug, setSlug] = useState("agenda-pro");
  const cleanSlug = normalizeSlug(slug) || "agenda-pro";

  function goTo(path: "agendamento" | "painel") {
    window.location.href = `/${path}/${cleanSlug}`;
  }

  return (
    <main className="landingApp">
      <section className="landingHero">
        <div className="landingCopy">
          <span>AgendaPro</span>
          <h1>Sistema de agendamento para barbearias</h1>
          <p>
            Agenda online, painel da barbearia, pagamentos, clientes e melhorias liberadas
            por assinatura em uma experiência simples para vender e usar no celular.
          </p>

          <div className="landingActions">
            <button type="button" onClick={() => goTo("agendamento")}>
              Quero agendar
            </button>
            <button type="button" onClick={() => goTo("painel")}>
              Entrar no painel
            </button>
            <a href="/plataforma?platform=1">Painel Plataforma</a>
          </div>
        </div>

        <div className="landingMockup" aria-label="Prévia visual do app AgendaPro">
          <div className="mockHeader">
            <span>A</span>
            <div>
              <small>Agendamento online</small>
              <strong>AgendaPro</strong>
            </div>
          </div>
          <div className="mockCard">
            <small>Hoje</small>
            <strong>Melhor horário</strong>
            <b>10:30</b>
          </div>
          <div className="mockSlots">
            <span>09:00</span>
            <span>10:30</span>
            <span>14:00</span>
            <span>16:30</span>
          </div>
          <div className="mockButton">Confirmar agendamento</div>
        </div>
      </section>

      <section className="landingSlugBox">
        <div>
          <span>Link da barbearia</span>
          <h2>Abrir agenda ou painel</h2>
          <p>Digite o slug cadastrado no Painel Plataforma. Exemplo: agenda-pro.</p>
        </div>

        <label>
          Slug
          <input
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder="agenda-pro"
          />
        </label>

        <div className="landingSlugActions">
          <button type="button" onClick={() => goTo("agendamento")}>
            Abrir agenda
          </button>
          <button type="button" onClick={() => goTo("painel")}>
            Abrir painel
          </button>
        </div>
      </section>

      <section className="landingFeatureGrid">
        <article>
          <span>01</span>
          <strong>Cliente sem atrito</strong>
          <p>Agenda pelo WhatsApp, escolhe serviço, horário e confirma sem login obrigatório.</p>
        </article>
        <article>
          <span>02</span>
          <strong>Painel da barbearia</strong>
          <p>Serviços, profissionais, agenda real, aparência, PIX e clientes no mesmo lugar.</p>
        </article>
        <article>
          <span>03</span>
          <strong>Plataforma para vender</strong>
          <p>Cadastro de barbearias, planos, vencimentos e liberação de melhorias por conta.</p>
        </article>
      </section>
    </main>
  );
}
