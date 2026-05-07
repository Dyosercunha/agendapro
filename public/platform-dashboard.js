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

  let supabaseClient = null;
  let dashboardData = null;
  let selectedShop = null;

  async function getSupabase() {
    if (supabaseClient) return supabaseClient;
    const mod = await import('https://esm.sh/@supabase/supabase-js@2');
    supabaseClient = mod.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    return supabaseClient;
  }

  function isPlatformRoute() {
    const path = location.pathname.toLowerCase();
    return location.search.includes('platform=1') || path.includes('/plataforma') || path.includes('/painel-plataforma');
  }

  function makeSlug(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
  }

  function moneyText(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function platformRoot() {
    let root = document.getElementById('platformRoot');
    if (root) return root;
    root = document.createElement('div');
    root.id = 'platformRoot';
    document.body.appendChild(root);
    return root;
  }

  function hideMainApp() {
    const root = document.getElementById('root');
    if (root) root.style.display = 'none';
  }

  function showMainApp() {
    const root = document.getElementById('root');
    if (root) root.style.display = '';
    const platform = document.getElementById('platformRoot');
    if (platform) platform.remove();
  }

  function readableError(error) {
    if (!error) return 'Erro desconhecido.';
    return error.message || error.details || error.hint || String(error);
  }

  async function currentSession() {
    const sb = await getSupabase();
    const { data } = await sb.auth.getSession();
    return data?.session || null;
  }

  async function isPlatformAdmin() {
    const session = await currentSession();
    if (!session?.user?.email) return false;
    const sb = await getSupabase();
    const { data, error } = await sb.rpc('is_platform_admin');
    if (error) {
      console.warn('AgendaPro: erro ao verificar desenvolvedor', error);
      return false;
    }
    return data === true;
  }

  async function findBarbershopForLoggedUser() {
    const session = await currentSession();
    if (!session?.user?.email) return null;
    const sb = await getSupabase();
    const { data, error } = await sb.rpc('find_my_barbershop_admin');
    if (error) return null;
    return data || null;
  }

  async function signInWithGoogle() {
    const sb = await getSupabase();
    const redirectTo = `${window.location.origin}/plataforma?platform=1`;
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) alert(readableError(error));
  }

  async function signOutPlatform() {
    const sb = await getSupabase();
    await sb.auth.signOut();
    renderLogin('Você saiu do Painel AgendaPro.');
  }

  function renderLoading() {
    hideMainApp();
    platformRoot().innerHTML = `
      <main class="platformApp">
        <section class="platformHero platformLoginHero">
          <div>
            <span>Painel Plataforma</span>
            <h1>AgendaPro</h1>
            <p>Carregando acesso e dados da nuvem...</p>
          </div>
        </section>
      </main>
    `;
  }

  function renderLogin(message = '') {
    hideMainApp();
    const root = platformRoot();
    root.innerHTML = `
      <main class="platformApp">
        <section class="platformHero platformLoginHero">
          <div>
            <span>Painel Plataforma</span>
            <h1>AgendaPro</h1>
            <p>Entre com o Google autorizado para cadastrar barbearias, liberar funções e administrar planos.</p>
            ${message ? `<p class="platformNotice">${message}</p>` : ''}
          </div>
          <button type="button" class="platformPrimary platformLoginButton" data-platform-login>Entrar com Google</button>
        </section>
      </main>
    `;
    root.querySelector('[data-platform-login]')?.addEventListener('click', signInWithGoogle);
  }

  async function loadDashboard() {
    hideMainApp();
    const sb = await getSupabase();
    const { data, error } = await sb.rpc('get_platform_dashboard');
    if (error) {
      renderLogin('Não foi possível puxar dados da nuvem: ' + readableError(error));
      return;
    }
    dashboardData = data || { stats: {}, barbershops: [] };
    renderDashboard();
  }

  function statCard(label, value) {
    return `<div class="platformStat"><span>${label}</span><strong>${value ?? '-'}</strong></div>`;
  }

  function shopStatus(status) {
    if (status === 'blocked') return '<b class="statusBlocked">Bloqueado</b>';
    if (status === 'trial') return '<b class="statusTrial">Teste</b>';
    return '<b class="statusActive">Ativo</b>';
  }

  function renderDashboard() {
    hideMainApp();
    const data = dashboardData || { stats: {}, barbershops: [] };
    const root = platformRoot();
    const shops = data.barbershops || [];
    root.innerHTML = `
      <main class="platformApp">
        <header class="platformHero">
          <div><span>Painel Plataforma</span><h1>AgendaPro</h1><p>Gerencie barbearias, planos, funções e suporte em um só lugar.</p></div>
          <div class="platformHeroActions"><button type="button" class="platformSecondary" data-refresh>Atualizar</button><button type="button" class="platformSecondary" data-platform-logout>Sair</button></div>
        </header>
        <section class="platformStats">
          ${statCard('Barbearias', data.stats?.total || 0)}${statCard('Ativas', data.stats?.active || 0)}${statCard('Bloqueadas', data.stats?.blocked || 0)}${statCard('Próximo vencimento', data.stats?.next_billing || '—')}
        </section>
        <section class="platformGrid">
          <div class="platformCard platformNewShopCard"><div class="platformTitle"><div><span>Cadastro</span><h2>Nova barbearia</h2></div></div>${newShopForm()}</div>
          <div class="platformCard"><div class="platformTitle"><div><span>Clientes</span><h2>Barbearias cadastradas</h2></div></div><div class="platformShopList">${shops.length ? shops.map(shopRow).join('') : '<p class="platformMuted">Nenhuma barbearia cadastrada.</p>'}</div></div>
        </section>
        <section class="platformCard" id="platformEditor">${selectedShop ? editShopForm(selectedShop) : '<p class="platformMuted">Selecione uma barbearia para editar plano, status e funções.</p>'}</section>
      </main>
    `;
    bindDashboardEvents();
  }

  function newShopForm() {
    return `
      <form class="platformForm" data-new-shop>
        <label>Nome da barbearia</label><input name="name" placeholder="Barbearia do João" required />
        <label>Slug do link</label><input name="slug" placeholder="barbearia-do-joao" />
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
    return `<article class="platformShop"><div><strong>${shop.name || 'Sem nome'}</strong><span>${shop.slug}</span><small>${shop.owner_email || 'Sem e-mail'} · ${shop.plan || 'sem plano'}</small></div><div class="platformShopActions">${shopStatus(shop.monthly_status)}<button type="button" data-edit-shop="${shop.slug}">Editar</button><a href="/painel/${shop.slug}" target="_blank" rel="noreferrer">Entrar no painel</a><a href="/agendamento/${shop.slug}" target="_blank" rel="noreferrer">Link cliente</a></div></article>`;
  }

  function editShopForm(shop) {
    const featureKeys = Object.keys(featureLabels);
    const features = shop.features || {};
    return `
      <div class="platformTitle"><div><span>Edição</span><h2>${shop.name}</h2></div><button type="button" class="platformSecondary" data-close-editor>Fechar</button></div>
      <form class="platformForm" data-edit-shop-form>
        <input type="hidden" name="slug" value="${shop.slug}" />
        <label>Nome</label><input name="name" value="${shop.name || ''}" />
        <label>WhatsApp</label><input name="whatsapp" value="${shop.whatsapp || ''}" />
        <label>E-mail do dono</label><input name="owner_email" type="email" value="${shop.owner_email || ''}" />
        <div class="platformTwoCols"><span><label>Plano</label><select name="plan">${['starter','professional','premium'].map(plan => `<option value="${plan}" ${shop.plan === plan ? 'selected' : ''}>${plan}</option>`).join('')}</select></span><span><label>Status</label><select name="monthly_status">${['active','trial','blocked'].map(status => `<option value="${status}" ${shop.monthly_status === status ? 'selected' : ''}>${status}</option>`).join('')}</select></span></div>
        <label>Vencimento</label><input name="next_billing_date" type="date" value="${shop.next_billing_date || ''}" />
        <label>Endereço</label><input name="address" value="${shop.address || ''}" />
        <label>Chave PIX</label><input name="pix_key" value="${shop.pix_key || ''}" />
        <label>Cor principal</label><input name="theme_color" type="color" value="${shop.theme_color || '#22c55e'}" />
        <button type="submit" class="platformPrimary">Salvar dados da barbearia</button>
      </form>
      <div class="platformFeatures"><h3>Funções liberadas</h3>${featureKeys.map(key => { const item = features[key] || {}; return `<label class="platformFeature"><span><strong>${featureLabels[key]}</strong><small>${key}</small></span><span class="featureChecks"><em>Liberado</em><input type="checkbox" data-feature-released="${key}" ${item.released ? 'checked' : ''} /><em>Ativo</em><input type="checkbox" data-feature-enabled="${key}" ${item.enabled ? 'checked' : ''} /></span></label>`; }).join('')}<button type="button" class="platformPrimary" data-save-features="${shop.slug}">Salvar funções</button></div>
    `;
  }

  function formValue(form, name) { return form.querySelector(`[name="${name}"]`)?.value || ''; }

  async function createShop(form) {
    const sb = await getSupabase();
    const name = formValue(form, 'name');
    const slug = formValue(form, 'slug') || makeSlug(name);
    const { data, error } = await sb.rpc('create_barbershop_full', { name_input: name, slug_input: slug, whatsapp_input: moneyText(formValue(form, 'whatsapp')), owner_email_input: formValue(form, 'owner_email'), plan_input: formValue(form, 'plan'), monthly_status_input: formValue(form, 'monthly_status'), next_billing_date_input: formValue(form, 'next_billing_date') || null, address_input: formValue(form, 'address'), pix_key_input: formValue(form, 'pix_key'), theme_color_input: formValue(form, 'theme_color') || '#22c55e' });
    if (error) throw error;
    alert(`Barbearia cadastrada.\n\nCliente: ${data.link_cliente}\nPainel: ${data.link_painel}`);
    selectedShop = null;
    await loadDashboard();
  }

  async function updateShop(form) {
    const sb = await getSupabase();
    const { error } = await sb.rpc('update_platform_barbershop', { target_slug: formValue(form, 'slug'), name_input: formValue(form, 'name'), whatsapp_input: moneyText(formValue(form, 'whatsapp')), owner_email_input: formValue(form, 'owner_email'), plan_input: formValue(form, 'plan'), monthly_status_input: formValue(form, 'monthly_status'), next_billing_date_input: formValue(form, 'next_billing_date') || null, address_input: formValue(form, 'address'), pix_key_input: formValue(form, 'pix_key'), theme_color_input: formValue(form, 'theme_color') || '#22c55e' });
    if (error) throw error;
    alert('Barbearia atualizada.');
    await loadDashboard();
  }

  async function saveFeatures(slug) {
    const sb = await getSupabase();
    const features = Object.keys(featureLabels).map(key => ({ feature_key: key, released: !!document.querySelector(`[data-feature-released="${key}"]`)?.checked, enabled: !!document.querySelector(`[data-feature-enabled="${key}"]`)?.checked }));
    const { error } = await sb.rpc('save_platform_feature_flags', { target_slug: slug, features_input: features });
    if (error) throw error;
    alert('Funções atualizadas.');
    await loadDashboard();
  }

  function bindDashboardEvents() {
    document.querySelector('[data-refresh]')?.addEventListener('click', () => loadDashboard());
    document.querySelector('[data-platform-logout]')?.addEventListener('click', signOutPlatform);
    const newForm = document.querySelector('[data-new-shop]');
    newForm?.querySelector('[name="name"]')?.addEventListener('input', event => { const slugInput = newForm.querySelector('[name="slug"]'); if (slugInput && !slugInput.dataset.manual) slugInput.value = makeSlug(event.target.value); });
    newForm?.querySelector('[name="slug"]')?.addEventListener('input', event => { event.target.dataset.manual = 'true'; event.target.value = makeSlug(event.target.value); });
    newForm?.addEventListener('submit', async event => { event.preventDefault(); const button = newForm.querySelector('button[type="submit"]'); button.disabled = true; button.textContent = 'Cadastrando...'; try { await createShop(newForm); newForm.reset(); } catch (error) { console.error(error); alert(readableError(error) || 'Não foi possível cadastrar a barbearia.'); } finally { button.disabled = false; button.textContent = 'Cadastrar barbearia'; } });
    document.querySelectorAll('[data-edit-shop]').forEach(button => { button.addEventListener('click', () => { selectedShop = (dashboardData.barbershops || []).find(shop => shop.slug === button.dataset.editShop); renderDashboard(); document.getElementById('platformEditor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); });
    document.querySelector('[data-close-editor]')?.addEventListener('click', () => { selectedShop = null; renderDashboard(); });
    const editForm = document.querySelector('[data-edit-shop-form]');
    editForm?.addEventListener('submit', async event => { event.preventDefault(); const button = editForm.querySelector('button[type="submit"]'); button.disabled = true; button.textContent = 'Salvando...'; try { await updateShop(editForm); } catch (error) { console.error(error); alert(readableError(error) || 'Não foi possível atualizar a barbearia.'); } finally { button.disabled = false; button.textContent = 'Salvar dados da barbearia'; } });
    document.querySelector('[data-save-features]')?.addEventListener('click', async event => { const button = event.currentTarget; button.disabled = true; button.textContent = 'Salvando...'; try { await saveFeatures(button.dataset.saveFeatures); } catch (error) { console.error(error); alert(readableError(error) || 'Não foi possível salvar as funções.'); } finally { button.disabled = false; button.textContent = 'Salvar funções'; } });
  }

  async function boot() {
    if (!isPlatformRoute()) return;
    renderLoading();
    const sb = await getSupabase();
    sb.auth.onAuthStateChange(async () => {
      if (await isPlatformAdmin()) await loadDashboard();
      else renderLogin('Entre com o Google liberado como desenvolvedor da plataforma.');
    });
    if (await isPlatformAdmin()) { await loadDashboard(); return; }
    const session = await currentSession();
    if (!session) { renderLogin('Faça login com o Google desenvolvedor para puxar e salvar os dados na nuvem.'); return; }
    const barberShop = await findBarbershopForLoggedUser();
    if (barberShop?.slug) renderLogin(`Este login pertence à barbearia ${barberShop.name}. Use o e-mail de desenvolvedor para cadastrar novas barbearias.`);
    else renderLogin('Este e-mail não está liberado como desenvolvedor da plataforma.');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
