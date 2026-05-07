(() => {
  const SUPABASE_URL = 'https://opcuaxkndslmejhuauyq.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_BdyBW7dYCg5qf4bBkRFdHQ_doLtqCsy';
  let sb = null;
  let deleted = [];
  let loadedBg = false;
  let currentBg = {};

  function slug() {
    const parts = location.pathname.split('/').filter(Boolean);
    const a = parts.indexOf('agendamento');
    const p = parts.indexOf('painel');
    return parts[a + 1] || parts[p + 1] || 'master-barbearia';
  }

  function admin() {
    return location.pathname.includes('/painel') || !!document.querySelector('.adminApp');
  }

  function supabase() {
    if (sb) return sb;
    if (!window.supabase?.createClient) throw new Error('Cliente Supabase não carregou. Atualize a página.');
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    return sb;
  }

  function norm(v) { return String(v || '').trim().toLowerCase(); }

  function cardName(card) {
    const input = card.querySelector('input');
    if (input) return input.value.trim();
    const strong = card.querySelector('strong');
    return strong ? strong.textContent.trim() : '';
  }

  function serviceCards() {
    return Array.from(document.querySelectorAll('.adminItem')).filter((card) => {
      const text = card.textContent || '';
      return text.includes('Tempo') && text.includes('Preço') && card.querySelector('input');
    });
  }

  function clientServiceButtons() { return Array.from(document.querySelectorAll('button.service')); }

  async function loadDeleted() {
    try {
      const api = supabase();
      const res = await api.from('services').select('name, deleted_at').not('deleted_at', 'is', null);
      deleted = (res.data || []).map((item) => norm(item.name));
      applyDeleted();
    } catch (e) { console.warn('AgendaPro: erro ao carregar serviços excluídos', e); }
  }

  function applyDeleted() {
    serviceCards().forEach((card) => {
      if (deleted.includes(norm(cardName(card)))) card.style.display = 'none';
    });
    clientServiceButtons().forEach((button) => {
      const name = norm(button.querySelector('strong')?.textContent || button.textContent);
      if (deleted.some((item) => name.includes(item))) button.style.display = 'none';
    });
  }

  function addDeleteButtons() {
    serviceCards().forEach((card) => {
      if (card.querySelector('[data-agenda-delete-service]')) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.agendaDeleteService = '1';
      btn.className = 'dangerButton agendaDeleteServiceButton';
      btn.textContent = 'Excluir serviço';
      btn.onclick = async () => {
        const name = cardName(card);
        if (!name) return;
        const ok = confirm('Excluir o serviço "' + name + '"? Ele não aparecerá mais para o cliente nem no painel. O histórico antigo será mantido.');
        if (!ok) return;
        btn.disabled = true;
        btn.textContent = 'Excluindo...';
        try {
          const res = await supabase().rpc('soft_delete_service_by_name', { target_slug: slug(), service_name_input: name });
          if (res.error) throw res.error;
          deleted.push(norm(name));
          card.style.display = 'none';
          alert('Serviço excluído.');
        } catch (e) {
          console.error(e);
          alert(e.message || 'Não foi possível excluir o serviço.');
          btn.disabled = false;
          btn.textContent = 'Excluir serviço';
        }
      };
      card.appendChild(btn);
    });
  }

  function bgLayer() {
    let layer = document.getElementById('agendaProBackgroundLayer');
    if (layer) return layer;
    layer = document.createElement('div');
    layer.id = 'agendaProBackgroundLayer';
    Object.assign(layer.style, {
      position: 'fixed', inset: '0', zIndex: '-1', pointerEvents: 'none',
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat'
    });
    document.body.prepend(layer);
    document.body.style.position = 'relative';
    return layer;
  }

  function applyBg(row) {
    currentBg = row || currentBg || {};
    const isAdmin = admin();
    const url = isAdmin ? currentBg.admin_background_url : currentBg.client_background_url;
    const opacity = Number(isAdmin ? currentBg.admin_background_opacity : currentBg.client_background_opacity) || 0;
    const layer = bgLayer();
    if (!url) {
      layer.style.backgroundImage = 'none';
      layer.style.opacity = '0';
      return;
    }
    layer.style.backgroundImage = "linear-gradient(rgba(7,10,13,.72),rgba(7,10,13,.72)), url('" + url + "')";
    layer.style.opacity = String(Math.max(0, Math.min(opacity, 0.7)));
  }

  function fillBgPanel(panel) {
    if (!panel) return;
    const clientUrl = panel.querySelector('[data-client-bg]');
    const adminUrl = panel.querySelector('[data-admin-bg]');
    const clientOp = panel.querySelector('[data-client-op]');
    const adminOp = panel.querySelector('[data-admin-op]');
    if (clientUrl && document.activeElement !== clientUrl) clientUrl.value = currentBg.client_background_url || '';
    if (adminUrl && document.activeElement !== adminUrl) adminUrl.value = currentBg.admin_background_url || '';
    if (clientOp && document.activeElement !== clientOp) clientOp.value = currentBg.client_background_opacity ?? 0.18;
    if (adminOp && document.activeElement !== adminOp) adminOp.value = currentBg.admin_background_opacity ?? 0.12;
  }

  async function loadBg(force) {
    if (loadedBg && !force) return;
    loadedBg = true;
    try {
      const res = await supabase().from('barbershops')
        .select('client_background_url,admin_background_url,client_background_opacity,admin_background_opacity')
        .eq('slug', slug()).single();
      if (res.data) {
        currentBg = res.data;
        applyBg(currentBg);
        document.querySelectorAll('[data-bg-panel]').forEach(fillBgPanel);
      }
    } catch (e) { console.warn('AgendaPro: erro ao carregar fundo', e); }
  }

  function appearanceCard() {
    return Array.from(document.querySelectorAll('.card')).find((card) => {
      const title = card.querySelector('h2');
      return title && (title.textContent || '').includes('Aparência');
    });
  }

  async function saveBg(panel, overrides = {}) {
    const payload = {
      target_slug: slug(),
      client_background_url_input: overrides.clientUrl ?? panel.querySelector('[data-client-bg]').value.trim(),
      admin_background_url_input: overrides.adminUrl ?? panel.querySelector('[data-admin-bg]').value.trim(),
      client_background_opacity_input: Number(overrides.clientOpacity ?? panel.querySelector('[data-client-op]').value ?? 0.18),
      admin_background_opacity_input: Number(overrides.adminOpacity ?? panel.querySelector('[data-admin-op]').value ?? 0.12),
    };
    const res = await supabase().rpc('save_background_settings', payload);
    if (res.error) throw res.error;
    loadedBg = false;
    await loadBg(true);
  }

  function addBgControls() {
    const card = appearanceCard();
    if (!card || card.querySelector('[data-bg-panel]')) return;
    const panel = document.createElement('div');
    panel.className = 'adminItem backgroundToolsPanel';
    panel.dataset.bgPanel = '1';
    panel.innerHTML = `
      <h3>Planos de fundo</h3>
      <p>Use uma imagem JPG, PNG ou WebP hospedada online. O app aplica uma camada escura para manter a leitura.</p>
      <label>Fundo da tela do cliente</label>
      <input data-client-bg placeholder="https://..." />
      <label>Intensidade no cliente</label>
      <input data-client-op type="number" min="0" max="0.7" step="0.05" value="0.18" />
      <button type="button" data-clear-client-bg class="outline backgroundClearButton">Limpar fundo do cliente</button>
      <label>Fundo do painel da barbearia</label>
      <input data-admin-bg placeholder="https://..." />
      <label>Intensidade no painel</label>
      <input data-admin-op type="number" min="0" max="0.7" step="0.05" value="0.12" />
      <button type="button" data-clear-admin-bg class="outline backgroundClearButton">Limpar fundo do painel</button>
      <button type="button" data-save-bg>Salvar planos de fundo</button>
    `;
    fillBgPanel(panel);

    panel.querySelector('[data-save-bg]').onclick = async () => {
      const btn = panel.querySelector('[data-save-bg]');
      btn.disabled = true;
      btn.textContent = 'Salvando...';
      try { await saveBg(panel); alert('Planos de fundo salvos.'); }
      catch (e) { console.error(e); alert(e.message || 'Não foi possível salvar os planos de fundo.'); }
      finally { btn.disabled = false; btn.textContent = 'Salvar planos de fundo'; }
    };

    panel.querySelector('[data-clear-client-bg]').onclick = async () => {
      if (!confirm('Limpar o fundo da tela do cliente?')) return;
      try { await saveBg(panel, { clientUrl: '' }); alert('Fundo do cliente removido.'); }
      catch (e) { alert(e.message || 'Não foi possível limpar o fundo do cliente.'); }
    };

    panel.querySelector('[data-clear-admin-bg]').onclick = async () => {
      if (!confirm('Limpar o fundo do painel da barbearia?')) return;
      try { await saveBg(panel, { adminUrl: '' }); alert('Fundo do painel removido.'); }
      catch (e) { alert(e.message || 'Não foi possível limpar o fundo do painel.'); }
    };

    card.appendChild(panel);
  }

  function run() {
    applyDeleted();
    if (admin()) { addDeleteButtons(); addBgControls(); }
  }

  function start() {
    if (!document.body) return;
    loadBg();
    loadDeleted();
    run();
    new MutationObserver(() => requestAnimationFrame(run)).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
