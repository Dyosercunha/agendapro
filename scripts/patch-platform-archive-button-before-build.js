const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'PlatformDashboard.tsx');
let source = fs.readFileSync(filePath, 'utf8');
let changed = false;

if (!source.includes('async function archiveShop(')) {
  const marker = '  async function saveFeatures() {';
  const fn = `  async function archiveShop(shop) {
    if (!shop?.slug) return;
    const ok = window.confirm('Excluir/arquivar a barbearia "' + (shop.name || shop.slug) + '" do painel? Ela continuará salva no banco de dados.');
    if (!ok) return;

    setSaving('archive-' + shop.slug);
    setMessage('');

    try {
      const { error } = await supabase.rpc('archive_barbershop', {
        target_slug: shop.slug,
        reason_input: 'Arquivada pelo Painel AgendaPro',
      });

      if (error) throw error;

      if (selectedShop?.slug === shop.slug) setSelectedShop(null);
      setMessage('Barbearia excluída do painel. O cadastro segue preservado no banco de dados.');
      await loadDashboard();
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setSaving('');
    }
  }

`;
  if (!source.includes(marker)) throw new Error('Ponto de inserção archiveShop não encontrado.');
  source = source.replace(marker, fn + marker);
  changed = true;
}

const oldActions = '<button type="button" onClick={() => setSelectedShop(JSON.parse(JSON.stringify(shop)))}>Editar</button>\n                  <a href={`/painel/${shop.slug}`} target="_blank" rel="noreferrer">Entrar no painel</a>\n                  <a href={`/agendamento/${shop.slug}`} target="_blank" rel="noreferrer">Link cliente</a>';
const newActions = '<button type="button" onClick={() => setSelectedShop(JSON.parse(JSON.stringify(shop)))}>Editar</button>\n                  <button type="button" className="platformDanger" disabled={saving === \'archive-\' + shop.slug} onClick={() => archiveShop(shop)}>{saving === \'archive-\' + shop.slug ? \'Excluindo...\' : \'Excluir\'}</button>\n                  <a href={`/painel/${shop.slug}`} target="_blank" rel="noreferrer">Entrar no painel</a>\n                  <a href={`/agendamento/${shop.slug}`} target="_blank" rel="noreferrer">Link cliente</a>';

if (source.includes(oldActions)) {
  source = source.replace(oldActions, newActions);
  changed = true;
}

if (changed) {
  fs.writeFileSync(filePath, source);
  console.log('Platform archive button patch applied.');
} else {
  console.log('Platform archive button patch skipped.');
}
