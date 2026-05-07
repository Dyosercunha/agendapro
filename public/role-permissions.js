(() => {
  const SUPABASE_URL = 'https://opcuaxkndslmejhuauyq.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_BdyBW7dYCg5qf4bBkRFdHQ_doLtqCsy';
  let sb = null;
  let currentRole = '';
  let currentEmail = '';

  function isPanelRoute() {
    return location.pathname.includes('/painel/');
  }

  function slugFromUrl() {
    const parts = location.pathname.split('/').filter(Boolean);
    const index = parts.indexOf('painel');
    return parts[index + 1] || 'master-barbearia';
  }

  function client() {
    if (sb) return sb;
    if (!window.supabase?.createClient) return null;
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    return sb;
  }

  function normalizeRole(role) {
    const value = String(role || '').toLowerCase().trim();
    if (['desenvolvedor', 'developer', 'platform', 'plataforma'].includes(value)) return 'desenvolvedor';
    if (['dono', 'owner'].includes(value)) return 'dono';
    return 'funcionario';
  }

  async function loadRole() {
    if (!isPanelRoute()) return;
    try {
      const api = client();
      if (!api) return;
      const sessionResult = await api.auth.getSession();
      currentEmail = sessionResult?.data?.session?.user?.email || '';
      if (!currentEmail) return;

      const { data, error } = await api.rpc('get_barbershop_accesses', { target_slug: slugFromUrl() });
      if (error) return;
      const account = (data || []).find((item) => String(item.email || '').toLowerCase() === currentEmail.toLowerCase());
      currentRole = normalizeRole(account?.role);
      document.documentElement.dataset.agendaRole = currentRole;
      applyRolePermissions();
    } catch (error) {
      console.warn('AgendaPro: não foi possível carregar permissões por cargo.', error);
    }
  }

  function hideByText(texts) {
    const normalized = texts.map((item) => item.toLowerCase());
    document.querySelectorAll('button, a, [role="button"]').forEach((element) => {
      const label = (element.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (!label) return;
      if (normalized.includes(label)) {
        element.style.display = 'none';
      }
    });
  }

  function hideCardsByHeading(texts) {
    const normalized = texts.map((item) => item.toLowerCase());
    document.querySelectorAll('.card, .adminCard, section, article').forEach((element) => {
      const heading = element.querySelector('h1,h2,h3,strong')?.textContent || '';
      const label = heading.replace(/\s+/g, ' ').trim().toLowerCase();
      if (normalized.some((item) => label.includes(item))) {
        element.style.display = 'none';
      }
    });
  }

  function applyRolePermissions() {
    if (!isPanelRoute() || !currentRole) return;

    if (currentRole === 'desenvolvedor') return;

    if (currentRole === 'funcionario') {
      hideByText(['Pagamentos', 'Melhorias', 'Conta']);
      hideCardsByHeading(['pagamentos', 'melhorias', 'conta', 'plano', 'assinatura', 'cobrança']);
      document.querySelectorAll('input[name*="pix" i], input[placeholder*="pix" i]').forEach((input) => {
        input.disabled = true;
        input.closest('.adminItem, .field, label, div')?.setAttribute('data-role-hidden', 'true');
      });
      document.querySelectorAll('[data-role-hidden="true"]').forEach((element) => {
        element.style.display = 'none';
      });
    }
  }

  function start() {
    if (!isPanelRoute()) return;
    loadRole();
    const observer = new MutationObserver(() => requestAnimationFrame(applyRolePermissions));
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
