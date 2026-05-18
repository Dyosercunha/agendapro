(() => {
  const SUPABASE_URL = 'https://opcuaxkndslmejhuauyq.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_BdyBW7dYCg5qf4bBkRFdHQ_doLtqCsy';
  const featureLabels = {
    pix: 'PIX antecipado',
    auto_confirmation: 'Confirmação WhatsApp',
    promotions: 'Promoções',
    waitlist: 'Lista de espera',
    loyalty: 'Fidelidade',
    google_login: 'Login Google do cliente',
    instagram_booking: 'Instagram',
    unique_link: 'Link de remarcar/cancelar',
  };

  let sb = null;
  let selectedShop = null;
  let dashboardData = null;

  function isRoute() {
    const path = location.pathname.toLowerCase();
    return location.search.includes('platform=1') || path.includes('/plataforma') || path.includes('/painel-plataforma');
  }

  function client() {
    if (sb) return sb;
    if (!window.supabase?.createClient) throw new Error('Cliente Supabase não carregou. Atualize a página com Ctrl+F5.');
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    return sb;
  }

  function root() {
    let el = document.getElementById('platformRoot');
    if (!el) {
      el = document.createElement('div');
      el.id = 'platformRoot';
      document.body.appendChild(el);
    }
    const app = document.getElementById('root');
    if (app) app.style.display = 'none';
    return el;
  }

  function errMsg(error) {
    return error?.message || error?.details || error?.hint || String(error || 'Erro desconhecido.');
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
  }

  function digits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  async function session() {
    const { data } = await client().auth.getSession();
    return data?.session || null;
  }

  async function isDev() {
    const current = await session();
    if (!current?.user?.email) return false;
    const { data, error } = await client().rpc('is_platform_admin');
    if (error) return false;
    return data === true;
  }

  async function login() {
    const { error } = await client().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/plataforma?platform=1` },
    });
    if (error) alert(errMsg(error));
  }

  async function logout() {
    await client().auth.signOut();
    renderLogin('Você saiu do Painel AgendaPro.');
  }

  function renderLogin(message = '') {
    root().innerHTML = `
      <main class="platformApp">
        <section class="platformHero platformLoginHero">
          <div>
            <span>Painel Plataforma</span>
            <h1>AgendaPro</h1>
            <p>Entre com o Google de desenvolvedor para cadastrar barbearias, liberar funções e administrar planos.</p>
            ${message ? `<p class="platformNotice">${message}</p>` : ''}
          </div>
          <button type="button" class="platformPrimary platformLoginButton" data-platform-login>Entrar com Google</button>
        </section>
      </main>
    `;
    document.querySelector('[data-platform-login]')?.addEventListener('click', login);
  }

  function renderLoading() {
    root().innerHTML = `
      <main class="platformApp">
        <section class="platformHero platformLoginHero">
          <div>
            <span>Painel Plataforma</span>
            <h1>AgendaPro</h1>
            <p>Carregando dados da nuvem...</p>
          </div>
        </section>
      </main>
    `;
  }

  function stat(label, value) {
    return `<div class="platformStat"><span>${label}</span><strong>${value ?? '-'}</strong></div>`;
  }

  function statusBadge(status) {
    if (status === 'blocked') return '<b class="statusBlocked">Bloqueado</b>';
    if (status === 'trial') return '<b class="statusTrial">Teste</b>';
    return '<b class="statusActive">Ativo</b>';
  }

  function newShopForm() {
    return `
      <form class="platformForm" data-new-shop>
        <label>Nome da barbearia</label><input name="name" placeholder="Master Barbearia" required />
        <label>Slug do link</label><input name="slug" placeholder="master-barbearia" />
        <label>WhatsApp</label><input name="whatsapp" placeholder="5551999999999" />
        <label>E-mail do dono</label><input name="owner_email" type="email" placeholder="dono@email.com" required />
        <div class="platformTwoCols"><span><label>Plano</label><select name="plan"><option value="starter">Inicial</option><option value="professional" selected>Profissional</option><option value="premium">Premium</option></select></span><span><label>Status</label><select name="monthly_status"><option value="active" selected>Ativo</option><option value="trial">Teste</option><option value="blocked">Bloqueado</option></select></span></div>
        <label>Vencimento</label><input name="next_billing_date" type="date" />
        <label>Endereço</label><input name="address" placeholder="Rua, número - bairro" />
        <label>Chave PIX</label><input name="pix_key" placeholder="CPF, CNPJ, e-mail ou telefone" />
        <label>Cor principal</label><input name="theme_color" type="color" value="#22c55e" />
        <button type="submit" class="platformPrimary">Cadastrar barbearia</button>
      </form>
    `;
  }

  function shopRow(shop) {
    return `<article class="platformShop"><div><strong>${shop.name || 'Sem nome'}</strong><span>${shop.slug}</span><small>${shop.owner_email || 'Sem e-mail'} · ${shop.plan || 'sem plano'}</small></div><div class="platformShopActions">${statusBadge(shop.monthly_status)}<button type="button" data-edit-shop="${shop.slug}">Editar</button><a href="/painel/${shop.slug}" target="_blank">Entrar no painel</a><a href="/${shop.slug}" target="_blank">Link cliente</a></div></article>`;
  }

  function editForm(shop) {
    const features = shop.features || {};
    return `
      <div class="platformTitle"><div><span>Edição</span><h2>${shop.name}</h2></div><button type="button" class="platformSecondary" data-close-editor>Fechar</button></div>
      <form class="platformForm" data-edit-shop-form>
        <input type="hidden" name="slug" value="${shop.slug}" />
        <label>Nome</label><input name="name" value="${shop.name || ''}" />
        <label>WhatsApp</label><input name="whatsapp" value="${shop.whatsapp || ''}" />
        <label>E-mail do dono</label><input name="owner_email" type="email" value="${shop.owner_email || ''}" />
        <div class="platformTwoCols"><span><label>Plano</label><select name="plan">${['starter','professional','premium'].map(p => `<option value="${p}" ${shop.plan === p ? 'selected' : ''}>${p}</option>`).join('')}</select></span><span><label>Status</label><select name="monthly_status">${['active','trial','blocked'].map(s => `<option value="${s}" ${shop.monthly_status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></span></div>
        <label>Vencimento</label><input name="next_billing_date" type="date" value="${shop.next_billing_date || ''}" />
        <label>Endereço</label><input name="address" value="${shop.address || ''}" />
        <label>Chave PIX</label><input name="pix_key" value="${shop.pix_key || ''}" />
        <label>Cor principal</label><input name="theme_color" type="color" value="${shop.theme_color || '#22c55e'}" />
        <button type="submit" class="platformPrimary">Salvar dados da barbearia</button>
      </form>
      <div class="platformFeatures"><h3>Funções liberadas</h3>${Object.keys(featureLabels).map(key => { const f = features[key] || {}; return `<label class="platformFeature"><span><strong>${featureLabels[key]}</strong><small>${key}</small></span><span class="featureChecks"><em>Liberado</em><input type="checkbox" data-feature-released="${key}" ${f.released ? 'checked' : ''}/><em>Ativo</em><input type="checkbox" data-feature-enabled="${key}" ${f.enabled ? 'checked' : ''}/></span></label>`; }).join('')}<button type="button" class="platformPrimary" data-save-features="${shop.slug}">Salvar funções</button></div>
    `;
  }

  function formValue(form, name) {
    return form.querySelector(`[name="${name}"]`)?.value || '';
  }

  async function loadDashboard() {
    renderLoading();
    const { data, error } = await client().rpc('get_platform_dashboard');
    if (error) {
      renderLogin('Não foi possível puxar dados da nuvem: ' + errMsg(error));
      return;
    }
    dashboardData = data || { stats: {}, barbershops: [] };
    renderDashboard();
  }

  function renderDashboard() {
    const data = dashboardData || { stats: {}, barbershops: [] };
    const shops = data.barbershops || [];
    root().innerHTML = `
      <main class="platformApp">
        <header class="platformHero"><div><span>Painel Plataforma</span><h1>AgendaPro</h1><p>Gerencie barbearias, planos, funções e suporte em um só lugar.</p></div><div class="platformHeroActions"><button type="button" class="platformSecondary" data-refresh>Atualizar</button><button type="button" class="platformSecondary" data-logout>Sair</button></div></header>
        <section class="platformStats">${stat('Barbearias', data.stats?.total || 0)}${stat('Ativas', data.stats?.active || 0)}${stat('Bloqueadas', data.stats?.blocked || 0)}${stat('Próximo vencimento', data.stats?.next_billing || '—')}</section>
        <section class="platformGrid"><div class="platformCard platformNewShopCard"><div class="platformTitle"><div><span>Cadastro</span><h2>Nova barbearia</h2></div></div>${newShopForm()}</div><div class="platformCard"><div class="platformTitle"><div><span>Clientes</span><h2>Barbearias cadastradas</h2></div></div><div class="platformShopList">${shops.length ? shops.map(shopRow).join('') : '<p class="platformMuted">Nenhuma barbearia cadastrada.</p>'}</div></div></section>
        <section class="platformCard" id="platformEditor">${selectedShop ? editForm(selectedShop) : '<p class="platformMuted">Selecione uma barbearia para editar plano, status e funções.</p>'}</section>
      </main>
    `;
    bindEvents();
  }

  async function createShop(form) {
    const name = formValue(form, 'name');
    const slug = formValue(form, 'slug') || slugify(name);
    const { data, error } = await client().rpc('create_barbershop_full', {
      name_input: name,
      slug_input: slug,
      whatsapp_input: digits(formValue(form, 'whatsapp')),
      owner_email_input: formValue(form, 'owner_email'),
      plan_input: formValue(form, 'plan'),
      monthly_status_input: formValue(form, 'monthly_status'),
      next_billing_date_input: formValue(form, 'next_billing_date') || null,
      address_input: formValue(form, 'address'),
      pix_key_input: formValue(form, 'pix_key'),
      theme_color_input: formValue(form, 'theme_color') || '#22c55e',
    });
    if (error) throw error;
    alert(`Barbearia cadastrada.\n\nCliente: ${data.link_cliente}\nPainel: ${data.link_painel}`);
    selectedShop = null;
    await loadDashboard();
  }

  async function updateShop(form) {
    const { error } = await client().rpc('update_platform_barbershop', {
      target_slug: formValue(form, 'slug'),
      name_input: formValue(form, 'name'),
      whatsapp_input: digits(formValue(form, 'whatsapp')),
      owner_email_input: formValue(form, 'owner_email'),
      plan_input: formValue(form, 'plan'),
      monthly_status_input: formValue(form, 'monthly_status'),
      next_billing_date_input: formValue(form, 'next_billing_date') || null,
      address_input: formValue(form, 'address'),
      pix_key_input: formValue(form, 'pix_key'),
      theme_color_input: formValue(form, 'theme_color') || '#22c55e',
    });
    if (error) throw error;
    alert('Barbearia atualizada.');
    await loadDashboard();
  }

  async function saveFeatures(slug) {
    const features = Object.keys(featureLabels).map(key => ({ feature_key: key, released: !!document.querySelector(`[data-feature-released="${key}"]`)?.checked, enabled: !!document.querySelector(`[data-feature-enabled="${key}"]`)?.checked }));
    const { error } = await client().rpc('save_platform_feature_flags', { target_slug: slug, features_input: features });
    if (error) throw error;
    alert('Funções atualizadas.');
    await loadDashboard();
  }

  function bindEvents() {
    document.querySelector('[data-refresh]')?.addEventListener('click', loadDashboard);
    document.querySelector('[data-logout]')?.addEventListener('click', logout);
    const newForm = document.querySelector('[data-new-shop]');
    newForm?.querySelector('[name="name"]')?.addEventListener('input', e => { const input = newForm.querySelector('[name="slug"]'); if (input && !input.dataset.manual) input.value = slugify(e.target.value); });
    newForm?.querySelector('[name="slug"]')?.addEventListener('input', e => { e.target.dataset.manual = '1'; e.target.value = slugify(e.target.value); });
    newForm?.addEventListener('submit', async e => { e.preventDefault(); const btn = newForm.querySelector('button[type="submit"]'); btn.disabled = true; btn.textContent = 'Cadastrando...'; try { await createShop(newForm); newForm.reset(); } catch (error) { alert(errMsg(error)); } finally { btn.disabled = false; btn.textContent = 'Cadastrar barbearia'; } });
    document.querySelectorAll('[data-edit-shop]').forEach(btn => btn.addEventListener('click', () => { selectedShop = (dashboardData.barbershops || []).find(s => s.slug === btn.dataset.editShop); renderDashboard(); document.getElementById('platformEditor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
    document.querySelector('[data-close-editor]')?.addEventListener('click', () => { selectedShop = null; renderDashboard(); });
    const edit = document.querySelector('[data-edit-shop-form]');
    edit?.addEventListener('submit', async e => { e.preventDefault(); const btn = edit.querySelector('button[type="submit"]'); btn.disabled = true; btn.textContent = 'Salvando...'; try { await updateShop(edit); } catch (error) { alert(errMsg(error)); } finally { btn.disabled = false; btn.textContent = 'Salvar dados da barbearia'; } });
    document.querySelector('[data-save-features]')?.addEventListener('click', async e => { const btn = e.currentTarget; btn.disabled = true; btn.textContent = 'Salvando...'; try { await saveFeatures(btn.dataset.saveFeatures); } catch (error) { alert(errMsg(error)); } finally { btn.disabled = false; btn.textContent = 'Salvar funções'; } });
  }

  async function boot() {
    if (!isRoute()) return;
    try {
      renderLoading();
      client();
      const dev = await Promise.race([
        isDev(),
        new Promise(resolve => setTimeout(() => resolve(false), 3500)),
      ]);
      if (dev) {
        await loadDashboard();
        return;
      }
      const current = await session();
      renderLogin(current ? 'Este e-mail não está liberado como desenvolvedor da plataforma.' : 'Faça login com o Google desenvolvedor para puxar e salvar os dados na nuvem.');
    } catch (error) {
      renderLogin('Falha ao iniciar o painel: ' + errMsg(error));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
