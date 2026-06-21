import React, { useEffect, useRef, useState } from "react";

type PublicBarbershop = {
  name: string;
  slug: string;
  status?: string;
};

const contactWhatsappUrl =
  "https://wa.me/5551992627663?text=Ol%C3%A1%2C%20quero%20conhecer%20o%20AgendaPro%20para%20minha%20barbearia.";

const demoBookingPath = "/agendamento/master-barbearia";

const planCards = [
  {
    name: "Inicial",
    price: "R$ 49/mês",
    description: "Para começar com agenda online, equipe, serviços e link público.",
    features: [
      "Agenda online",
      "Cadastro de serviços",
      "Cadastro de profissionais",
      "Link público de agendamento",
      "Painel básico da barbearia",
    ],
  },
  {
    name: "Profissional",
    price: "R$ 89/mês",
    description: "Para barbearias que querem vender melhor e personalizar a experiência.",
    features: [
      "Tudo do Inicial",
      "Aparência personalizada",
      "PIX antecipado",
      "Clientes e histórico",
      "Promoções inteligentes",
      "Carrossel de fotos",
      "Confirmação por WhatsApp",
    ],
    featured: true,
  },
  {
    name: "Premium",
    price: "R$ 149/mês",
    description: "Para operação completa com agenda avançada, relatórios e automações.",
    features: [
      "Tudo do Profissional",
      "Agenda visual premium",
      "Lista de espera",
      "Fidelidade",
      "Comissões por profissional",
      "Relatórios",
      "Login Google cliente",
    ],
  },
];

const audienceCards = [
  {
    title: "Barbearias",
    text: "Organize horários, equipe, serviços e pagamentos sem depender só de conversa no WhatsApp.",
  },
  {
    title: "Salões",
    text: "Crie uma vitrine simples para o cliente escolher serviço, profissional, data e horário.",
  },
  {
    title: "Estética",
    text: "Controle agenda, clientes e confirmações com uma experiência pensada para celular.",
  },
];

const resourceCards = [
  {
    title: "Agenda inteligente",
    text: "Horários respeitam duração dos serviços, pausas, bloqueios e funcionamento real.",
  },
  {
    title: "Painel da barbearia",
    text: "Serviços, profissionais, clientes, pagamentos, aparência e recursos liberados por plano.",
  },
  {
    title: "Página do cliente",
    text: "A barbearia ganha um mini-site com logo, capa, endereço, WhatsApp, serviços e horários.",
  },
  {
    title: "Gestão do negócio",
    text: "Acompanhe clientes, pagamentos, serviços e evolução da agenda em uma rotina simples.",
  },
];

const previewCards = [
  {
    step: "01",
    title: "Cliente escolhe o serviço",
    text: "Cards claros com preço, duração, promoção e seleção simples.",
  },
  {
    step: "02",
    title: "Escolhe data e horário",
    text: "A agenda mostra horários livres, ocupados, pausas e melhores encaixes.",
  },
  {
    step: "03",
    title: "Barbearia acompanha tudo",
    text: "O painel mostra agendamentos, clientes, pagamentos e ações rápidas.",
  },
];

const benefitCards = [
  "Menos mensagens repetidas no WhatsApp",
  "Mais controle sobre horários ocupados",
  "Identidade visual para cada barbearia",
  "Planos prontos para cobrar mensalidade",
  "Dados separados por estabelecimento",
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
  const [slugLoading, setSlugLoading] = useState(false);
  const [shopOptions, setShopOptions] = useState<PublicBarbershop[]>([]);
  const [showShopOptions, setShowShopOptions] = useState(false);
  const [selectedShop, setSelectedShop] = useState<PublicBarbershop | null>(null);
  const [metrics, setMetrics] = useState({
    appointments: 0,
    barbershops: 0,
    source: "fallback",
  });
  const slugInputRef = useRef<HTMLInputElement | null>(null);
  const cleanSlug = normalizeSlug(slug);
  const isPlatformPanelKeyword = cleanSlug === "plataforma";

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
        // Mantém a landing carregando mesmo se as métricas públicas não responderem.
      }
    }

    loadPublicMetrics();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const typed = slug.trim();
    const typedSlug = normalizeSlug(typed);

    if (typedSlug === "plataforma") {
      setShowShopOptions(false);
      setSlugError("");
      return () => {
        active = false;
      };
    }

    if (typed.length < 2 || selectedShopStillMatches()) {
      if (typed.length < 2) setShowShopOptions(false);
      return () => {
        active = false;
      };
    }

    const timer = window.setTimeout(async () => {
      const data = await loadAvailableShops(typed);
      if (!active || !data) return;

      if (data.unavailable) {
        setSlugError(
          `A barbearia "${data.unavailable.name}" está ${data.unavailable.label} e não está mais disponível no app.`
        );
        setShowShopOptions(true);
        return;
      }

      if (!data.match && Array.isArray(data.shops) && data.shops.length) {
        setShowShopOptions(true);
      }
    }, 280);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [slug, selectedShop]);

  async function loadAvailableShops(query = "") {
    try {
      const response = await fetch(`/api/public-barbershops?query=${encodeURIComponent(query)}`);
      if (!response.ok) return null;
      const data = await response.json();
      if (!data?.ok) return null;

      setShopOptions(Array.isArray(data.shops) ? data.shops : []);
      return data;
    } catch {
      return null;
    }
  }

  function selectedShopStillMatches() {
    if (!selectedShop) return false;

    const typed = normalizeSlug(slug);
    return typed === normalizeSlug(selectedShop.name) || typed === normalizeSlug(selectedShop.slug);
  }

  async function goTo(path: "agendamento" | "painel") {
    if (path === "painel" && isPlatformPanelKeyword) {
      window.location.href = "/plataforma?platform=1";
      return;
    }

    if (path === "agendamento" && isPlatformPanelKeyword) {
      setSlugError("Para acessar a plataforma, digite Plataforma e clique em Abrir painel.");
      setShowShopOptions(false);
      return;
    }

    if (!cleanSlug) {
      setSlugError("Digite o nome da barbearia para continuar.");
      setShowShopOptions(true);
      loadAvailableShops("");
      slugInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      slugInputRef.current?.focus();
      return;
    }

    if (selectedShopStillMatches()) {
      window.location.href =
        path === "painel" ? `/painel/${selectedShop?.slug}` : `/agendamento/${selectedShop?.slug}`;
      return;
    }

    setSlugLoading(true);
    setSlugError("");

    const data = await loadAvailableShops(slug);
    setSlugLoading(false);

    if (data?.match?.slug) {
      window.location.href =
        path === "painel" ? `/painel/${data.match.slug}` : `/agendamento/${data.match.slug}`;
      return;
    }

    if (data?.unavailable) {
      setSlugError(
        `A barbearia "${data.unavailable.name}" está ${data.unavailable.label} e não está mais disponível no app.`
      );
      setShowShopOptions(true);
      return;
    }

    setSlugError("Não encontrei essa barbearia ativa. Escolha uma das barbearias disponíveis abaixo.");
    setShowShopOptions(true);
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
          <a href={demoBookingPath}>Demonstração</a>
        </div>
      </nav>

      <section className="landingHero">
        <div className="landingCopy">
          <div className="landingLogoLockup">
            <img src="/agenda-pro-logo.png" alt="AgendaPro" />
            <span>AgendaPro</span>
          </div>
          <h1>Sistema de agendamento para barbearias</h1>
          <p className="landingLead">
            Clientes agendam pelo celular. A barbearia gerencia tudo em um painel.
          </p>
          <p>
            O AgendaPro cria uma página exclusiva para cada estabelecimento, organiza agenda,
            equipe, pagamentos, aparência e recursos por plano.
          </p>

          <div className="landingActions">
            <a className="landingPrimaryCta" href={contactWhatsappUrl} target="_blank" rel="noreferrer">
              Falar comigo no WhatsApp
            </a>
            <button type="button" onClick={() => goTo("agendamento")}>
              Quero agendar
            </button>
            <a href={demoBookingPath}>Ver demonstração</a>
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
              : "Métricas ao vivo em configuração"}
          </span>
        </article>
      </section>

      <section className="landingSlugBox">
        <div>
          <span>Link da barbearia</span>
          <h2>Acesse agenda ou painel pelo nome</h2>
          <p>Digite o nome ou link cadastrado da barbearia. Exemplo: Nome da barbearia.</p>
        </div>

        <label>
          Nome da barbearia
          <input
            ref={slugInputRef}
            value={slug}
            onChange={(event) => {
              setSlug(event.target.value);
              setSlugError("");
              setSelectedShop(null);
              setShowShopOptions(false);
            }}
            onFocus={() => {
              setShowShopOptions(true);
              if (!shopOptions.length) loadAvailableShops("");
            }}
            placeholder="Nome da barbearia"
          />
          {slugError && <small className="landingError">{slugError}</small>}
          {showShopOptions && (
            <div className="landingShopSuggestions">
              <strong>Barbearias ativas no AgendaPro</strong>
              {shopOptions.length > 0 ? (
                <div>
                  {shopOptions.map((shop) => (
                    <button
                      type="button"
                      key={shop.slug}
                      onClick={() => {
                        setSlug(shop.name);
                        setSelectedShop(shop);
                        setSlugError("");
                        setShowShopOptions(false);
                      }}
                    >
                      <span>{shop.name}</span>
                      <small>{shop.slug}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="landingShopEmpty">
                  Nenhuma barbearia ativa carregada ainda. Digite o nome cadastrado ou tente novamente em instantes.
                </p>
              )}
            </div>
          )}
        </label>

        <div className="landingSlugActions">
          <button type="button" onClick={() => goTo("agendamento")} disabled={slugLoading}>
            {slugLoading ? "Verificando..." : "Abrir agenda"}
          </button>
          <button type="button" onClick={() => goTo("painel")} disabled={slugLoading}>
            {slugLoading ? "Verificando..." : "Abrir painel"}
          </button>
        </div>
      </section>

      <section className="landingAudienceSection">
        <div className="landingSectionIntro">
          <h2>Feito para negócios com atendimento por horário</h2>
          <p>
            Uma solução simples para quem precisa organizar agenda, reduzir erros e vender uma
            experiência mais profissional.
          </p>
        </div>

        <div className="landingAudienceGrid">
          {audienceCards.map((item) => (
            <article key={item.title}>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landingDemoSection">
        <div className="landingSectionIntro">
          <h2>Como a experiência aparece para o cliente</h2>
          <p>O fluxo é direto: serviço, profissional, data, horário e confirmação.</p>
        </div>

        <div className="landingDemoGrid">
          {previewCards.map((item) => (
            <article key={item.step}>
              <span>{item.step}</span>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landingResourceSection">
        <div className="landingSectionIntro">
          <h2>Recursos para vender, operar e crescer</h2>
          <p>O AgendaPro junta página do cliente, painel da barbearia e gestão comercial em um fluxo simples.</p>
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

      <section className="landingContactSection">
        <div>
          <h2>Quer colocar sua barbearia no AgendaPro?</h2>
          <p>
            Chame no WhatsApp para cadastrar sua barbearia, montar os serviços, liberar o painel
            e deixar o link pronto para divulgar.
          </p>
        </div>
        <a href={contactWhatsappUrl} target="_blank" rel="noreferrer">
          Falar comigo no WhatsApp
        </a>
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
