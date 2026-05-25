import React, { useRef, useState } from "react";

const planCards = [
  {
    name: "Inicial",
    price: "R$ 49/mês",
    description: "Agenda online, serviços, profissionais, link público e painel básico.",
  },
  {
    name: "Profissional",
    price: "R$ 89/mês",
    description: "Aparência personalizada, PIX, clientes, promoções e confirmação pelo WhatsApp.",
  },
  {
    name: "Premium",
    price: "R$ 149/mês",
    description: "Fidelidade, lista de espera, fotos, Instagram, relatórios e recursos avançados.",
  },
];

const productHighlights = [
  "Agendamento pelo celular",
  "Painel da barbearia",
  "Controle de clientes",
  "Recursos por plano",
];

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
          <p className="landingLead">Agendamento inteligente para barbearias, salões e estética</p>
          <p>
            Agenda online, painel de gestão, pagamentos, clientes e melhorias liberadas
            por assinatura em uma experiência simples para vender e usar no celular.
          </p>

          <div className="landingProofRow">
            {productHighlights.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>

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
            <span className="mockLogo">
              <img src="/agenda-pro-logo.png" alt="AgendaPro" />
            </span>
            <div>
              <small>Agenda da barbearia</small>
              <strong>AgendaPro</strong>
            </div>
          </div>
          <div className="mockCard">
            <small>Hoje</small>
            <strong>Melhor horário</strong>
            <b>10:30</b>
          </div>
          <div className="mockMiniStats">
            <span>
              <strong>12</strong>
              <small>agendamentos</small>
            </span>
            <span>
              <strong>R$ 420</strong>
              <small>previsto</small>
            </span>
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

      <section className="landingPlanGrid" aria-label="Planos do AgendaPro">
        <div className="landingSectionIntro">
          <h2>Planos simples para começar e crescer</h2>
          <p>Você libera recursos conforme a barbearia evolui, sem complicar o uso diário.</p>
        </div>

        {planCards.map((plan) => (
          <article className={plan.name === "Profissional" ? "landingPlanCard featuredPlan" : "landingPlanCard"} key={plan.name}>
            <span>{plan.name}</span>
            <strong>{plan.price}</strong>
            <p>{plan.description}</p>
          </article>
        ))}
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

      <footer className="landingFooter">
        <strong>AgendaPro</strong>
        <span>Sistema de agenda online para negócios de atendimento com hora marcada.</span>
      </footer>
    </main>
  );
}
