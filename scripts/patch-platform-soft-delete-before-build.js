const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'PlatformDashboard.tsx');
let source = fs.readFileSync(filePath, 'utf8');
let changed = false;

if (!source.includes('async function softDeleteShop(')) {
  const marker = '  async function saveFeatures() {';
  const fn = `  async function softDeleteShop(shop) {
    if (!shop?.slug) return;
    const ok = window.confirm('Excluir a barbearia "' + (shop.name || shop.slug) + '" da lista? Ela ficará salva no banco como excluída.');
    if (!ok) return;

    setSaving('delete-' + shop.slug);
    setMessage('');

    try {
      const { error } = await supabase.rpc('soft_delete_platform_barbershop', {
        target_slug: shop.slug,
      });

      if (error) throw error;

      if (selectedShop?.slug === shop.slug) setSelectedShop(null);
      setMessage('Barbearia removida da lista. O registro continua salvo no banco.');
      await loadDashboard();
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setSaving('');
    }
  }

`;
  if (!source.includes(marker)) throw new Error('Não encontrei local para inserir softDeleteShop.');
  source = source.replace(marker, fn + marker);
  changed = true;
}

if (!source.includes('Excluir da lista')) {
  const target = `                  <a href={\`/\${shop.slug}\`} target="_blank" rel="noreferrer">Link cliente</a>`;
  const replacement = `                  <a href={\`/\${shop.slug}\`} target="_blank" rel="noreferrer">Link cliente</a>
                  <button type="button" className="platformDanger" disabled={saving === 'delete-' + shop.slug} onClick={() => softDeleteShop(shop)}>{saving === 'delete-' + shop.slug ? 'Excluindo...' : 'Excluir da lista'}</button>`;
  if (source.includes(target)) {
    source = source.replace(target, replacement);
    changed = true;
  } else {
    const target2 = `                  <a href={\`/painel/\${shop.slug}\`} target="_blank" rel="noreferrer">Entrar no painel</a>`;
    const replacement2 = `                  <a href={\`/painel/\${shop.slug}\`} target="_blank" rel="noreferrer">Entrar no painel</a>
                  <button type="button" className="platformDanger" disabled={saving === 'delete-' + shop.slug} onClick={() => softDeleteShop(shop)}>{saving === 'delete-' + shop.slug ? 'Excluindo...' : 'Excluir da lista'}</button>`;
    if (!source.includes(target2)) throw new Error('Não encontrei local para inserir botão de excluir barbearia.');
    source = source.replace(target2, replacement2);
    changed = true;
  }
}

if (changed) {
  fs.writeFileSync(filePath, source);
  console.log('Platform soft delete patch applied.');
} else {
  console.log('Platform soft delete patch skipped.');
}
