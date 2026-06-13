import React, { useEffect, useRef, useState } from "react";

const planCards = [
  {
    name: "Inicial",
    price: "R$ 49/mês",
    description: "Para começar com agenda online e painel básico.",
    features: ["Agenda online", "Serviços e profissionais", "Link público", "Painel básico"],
  },
  {
    name: "Profissional",
    price: "R$ 89/mês",
    description: "Para barbearias que querem identidade, PIX e clientes.",
    features: ["Aparência personalizada", "PIX", "Clientes", "Promoções simples"],
    featured: true,
  },
  {
    name: "Premium",
    price: "R$ 149/mês",
    description: "Para operação completa com recursos avançados.",
    features: ["Fidelidade", "Lista de espera", "Instagram", "Relatórios"],
  },
];

const resourceCards = [
  {
    title: "Agenda inteligente",
    text: "Horários respeitam duração dos serviços, pausas, bloqueios e agenda real da barbearia.",
  },
  {
    title: "Painel da barbearia",
    text: "Serviços, profissionais, clientes, pagamentos, aparência e recursos liberados por plano.",
  },
  {
    title: "Cliente sem atrito",
    text: "O cliente agenda pelo link, recebe resumo claro e pode falar com a barbearia quando precisar.",
  },
  {
    title: "Plataforma comercial",
    text: "Você cadastra barbearias, controla planos, vencimentos, status e melhorias por conta.",
  },
];

const benefitCards = [
  "Menos conversa repetida no WhatsApp",
  "Mais controle sobre horários ocupados",
  "Identidade visual para cada barbearia",
  "Planos prontos para cobrar mensalidade",
  "Dados separados por barbearia",
  "Painel pensado para celular",
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

function formatCount(value: number) {
  return new Intl.NumberFormat("pt-BR").format(Math.max(0, Number(value || 0)));
}

export default function LandingPage() {
  const [slug, setSlug] = useState("");
  const [slugError, setSlugError] = useState("");
  const [metrics, setMetrics] = useState({
    appointments: 0,
    barbershops: 0,
    source: "fallback",
  });
  const slugInputRef = useRef<HTMLInputElement | null>(null);
  const cleanSlug = normalizeSlug(slug);

  useEffect(() => {
    let active = true;

    async function loadPublicMetrics() {
      try {
        const response = await fetch("/api/public-metrics");
        if (!response.ok) return;
        const data = await response.json();
        if (!active || !data?.ok) return;

        setMetrics({
          appointments: Number(data.appointments || 0),
          barbershops: Number(data.barbershops || 0),
          source: String(data.source || "fallback"),
        });
      } catch {
        // mantém fallback visual
      }
    }

    loadPublicMetrics();

    return () => {
      active = false;
    };
  }, []);

  function goTo(path: "agendamento" | "painel") {
    if (!cleanSlug) {
      setSlugError("Digite o link da barbearia para continuar. Exemplo: master.");
      slugInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      slugInputRef.current?.focus();
      return;
    }

    window.location.href =
      path === "painel" ? `/painel/${cleanSlug}` : `/agendamento/${cleanSlug}`;
  }

  return (
    <main className="landingApp">
      <nav className="landingNav" aria-label="Navegação principal">
        <a className="landingBrand" href="/">
          <img src="/agenda-pro-logo.png" alt="AgendaPro" />
          <span>AgendaPro</span>
        </a>
        <div>
          <button type="button" onClick={() => goTo("agendamento")}>
            Quero agendar
          </button>
          <button type="button" onClick={() => goTo("painel")}>
            Sou barbearia
          </button>
          <a href="/plataforma?platform=1">Painel Plataforma</a>
        </div>
      </nav>

      <section className="landingHero">
        <div className="landingCopy">
          <div className="landingLogoLockup">
            <img src="/agenda-pro-logo.png" alt="AgendaPro" />
            <span>AgendaPro</span>
          </div>
          <h1>Sua barbearia com agendamento profissional</h1>
          <p className="landingLead">
            Seus clientes agendam pelo celular. Você gerencia tudo em um painel.
          </p>
          <p>
            Crie uma página exclusiva para cada estabelecimento, venda planos por assinatura e
            entregue uma experiência premium de agendamento.
          </p>

          <div className="landingActions">
            <button type="button" onClick={() => goTo("agendamento")}>
              Quero agendar
            </button>
            <button type="button" onClick={() => goTo("painel")}>
              Sou barbearia
            </button>
            <a href="/agendamento/demo">Ver demonstração</a>
          </div>
        </div>

        <div className="landingMockup" aria-label="Mockup do celular mostrando a agenda">
          <span className="phoneSpeaker" />
          <div className="mockHeader">
            <span className="mockLogo">
              <img src="/agenda-pro-logo.png" alt="AgendaPro" />
            </span>
            <div>
              <small>Agenda no celular</small>
              <strong>AgendaPro</strong>
            </div>
          </div>
          <div className="mockCard">
            <small>Próximo atendimento</small>
            <strong>Corte + barba</strong>
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

      <section className="landingSocialProof" aria-label="Números do AgendaPro">
        <article>
          <strong>{formatCount(metrics.barbershops)}</strong>
          <span>barbearias cadastradas</span>
        </article>
        <article>
          <strong>{formatCount(metrics.appointments)}</strong>
          <span>agendamentos realizados</span>
        </article>
        <article>
          <strong>Grátis para começar</strong>
          <span>
            {metrics.source === "supabase"
              ? "Dados sincronizados em tempo real"
              : "Ative o Supabase para métricas ao vivo"}
          </span>
        </article>
      </section>

      <section className="landingSlugBox">
        <div>
          <span>Link da barbearia</span>
          <h2>Acesse agenda ou painel pelo slug</h2>
          <p>Digite o identificador cadastrado no Painel Plataforma. Exemplo: master.</p>
        </div>

        <label>
          Digite o slug da barbearia
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

      <section className="landingResourceSection">
        <div className="landingSectionIntro">
          <h2>Recursos para vender, operar e crescer</h2>
          <p>O AgendaPro junta página do cliente, painel da barbearia e controle da plataforma.</p>
        </div>

        <div className="landingResourceGrid">
          {resourceCards.map((item, index) => (
            <article key={item.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landingPlanGrid" aria-label="Planos do AgendaPro">
        <div className="landingSectionIntro">
          <h2>Planos simples para cobrar mensalidade</h2>
          <p>Comece com o essencial e libere recursos conforme cada barbearia evolui.</p>
        </div>

        {planCards.map((plan) => (
          <article className={plan.featured ? "landingPlanCard featuredPlan" : "landingPlanCard"} key={plan.name}>
            <span>{plan.name}</span>
            <strong>{plan.price}</strong>
            <p>{plan.description}</p>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="landingBenefitSection">
        <div>
          <h2>Benefícios claros para quem agenda e para quem atende</h2>
          <p>Menos improviso, mais previsibilidade e uma experiência com cara de app profissional.</p>
        </div>

        <div className="landingBenefitGrid">
          {benefitCards.map((benefit) => (
            <article key={benefit}>
              <span />
              <strong>{benefit}</strong>
            </article>
          ))}
        </div>
      </section>

      <footer className="landingFooter">
        <strong>
          <img src="/agenda-pro-logo.png" alt="AgendaPro" />
          AgendaPro
        </strong>
        <span>Sistema de agenda online para negócios de atendimento com hora marcada.</span>
      </footer>
    </main>
  );
}
