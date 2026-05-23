import React, { useRef, useState } from "react";

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
  const [slug, setSlug] = useState("");
  const [slugError, setSlugError] = useState("");
  const slugInputRef = useRef<HTMLInputElement | null>(null);
  const cleanSlug = normalizeSlug(slug);

  function goTo(path: "agendamento" | "painel") {
    if (!cleanSlug) {
      setSlugError("Digite o link da barbearia para continuar. Exemplo: master.");
      slugInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      slugInputRef.current?.focus();
      return;
    }

    window.location.href = path === "painel" ? `/painel/${cleanSlug}` : `/${cleanSlug}`;
  }

  return (
    <main className="landingApp">
      <section className="landingHero">
        <div className="landingCopy">
          <h1>AgendaPro</h1>
          <p className="landingLead">Sistema de agendamento para barbearias</p>
          <p>
            Agenda online, painel da barbearia, pagamentos, clientes e melhorias liberadas
            por assinatura em uma experiência simples para vender e usar no celular.
          </p>

          <div className="landingActions">
            <button type="button" onClick={() => goTo("agendamento")}>
              Quero agendar
            </button>
            <button type="button" onClick={() => goTo("painel")}>
              Sou barbearia
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
          <p>Digite o link cadastrado no Painel Plataforma. Exemplo: master.</p>
        </div>

        <label>
          Digite o link da barbearia
          <input
            ref={slugInputRef}
            value={slug}
            onChange={(event) => {
              setSlug(event.target.value);
              setSlugError("");
            }}
            placeholder="master"
          />
          {slugError && <small className="landingError">{slugError}</small>}
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
