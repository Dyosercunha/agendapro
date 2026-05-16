const fs = require("fs");
const path = require("path");

const filePath = path.join(process.cwd(), "PlatformDashboard.tsx");
let source = fs.readFileSync(filePath, "utf8");

function replaceOnce(search, replacement) {
  if (source.includes(search)) {
    source = source.replace(search, replacement);
  }
}

source = source.replace(/const featureLabels = \{[\s\S]*?\};/, `const featureLabels = {
  service_delete: "Excluir serviço seguro",
  backplate: "Backplate / plano de fundo",
  appearance_media: "Fotos Antes / Processo / Finalizado",
  promotions: "Promoções",
  waitlist: "Lista de espera",
  loyalty: "Fidelidade",
  google_client: "Login Google do cliente",
  instagram: "Instagram",
};`);

if (!source.includes("plan_price: 89")) {
source = source.replace(/theme_color: "#22c55e",\n  \};/, `theme_color: "#22c55e",
    plan_price: 89,
  };`);
}

if (!source.includes("value={newShop.plan_price")) {
replaceOnce(
  `<label>Vencimento</label>\n            <input value={newShop.next_billing_date} onChange={(event) => updateNewShop("next_billing_date", event.target.value)} type="date" />`,
  `<div className="platformTwoCols">
              <span><label>Vencimento</label><input value={newShop.next_billing_date} onChange={(event) => updateNewShop("next_billing_date", event.target.value)} type="date" /></span>
              <span><label>Valor mensal</label><input value={newShop.plan_price || ""} onChange={(event) => updateNewShop("plan_price", event.target.value)} type="number" min="0" step="1" placeholder="89" /></span>
            </div>`
);
}

if (!source.includes("value={selectedShop.plan_price")) {
replaceOnce(
  `<label>Vencimento</label><input value={selectedShop.next_billing_date || ""} onChange={(event) => updateSelected("next_billing_date", event.target.value)} type="date" />`,
  `<div className="platformTwoCols">
                <span><label>Vencimento</label><input value={selectedShop.next_billing_date || ""} onChange={(event) => updateSelected("next_billing_date", event.target.value)} type="date" /></span>
                <span><label>Valor mensal</label><input value={selectedShop.plan_price ?? ""} onChange={(event) => updateSelected("plan_price", event.target.value)} type="number" min="0" step="1" placeholder="89" /></span>
              </div>`
);
}

if (!source.includes("plan_price_input: Number(newShop.plan_price")) {
replaceOnce(
  `setMessage(\`Barbearia cadastrada. Cliente: \${data?.link_cliente || ""} Painel: \${data?.link_painel || ""}\`);`,
  `try {
        await supabase.rpc("update_platform_barbershop", {
          target_slug: newShop.slug || makeSlug(newShop.name),
          name_input: newShop.name,
          whatsapp_input: onlyDigits(newShop.whatsapp),
          owner_email_input: newShop.owner_email,
          plan_input: newShop.plan,
          monthly_status_input: newShop.monthly_status,
          next_billing_date_input: newShop.next_billing_date || null,
          address_input: newShop.address,
          pix_key_input: newShop.pix_key,
          theme_color_input: newShop.theme_color || "#22c55e",
          plan_price_input: Number(newShop.plan_price || 0),
        });
      } catch (_syncPriceError) {}

      setMessage(\`Barbearia cadastrada. Cliente: \${data?.link_cliente || ""} Painel: \${data?.link_painel || ""}\`);`
);
}

if (!source.includes("plan_price_input: Number(selectedShop.plan_price")) {
replaceOnce(
  `theme_color_input: selectedShop.theme_color || "#22c55e",\n      });`,
  `theme_color_input: selectedShop.theme_color || "#22c55e",
        plan_price_input: Number(selectedShop.plan_price || 0),
      });`
);
}

replaceOnce(
  `released: Boolean(selectedShop.features?.[key]?.released),\n        enabled: Boolean(selectedShop.features?.[key]?.enabled),`,
  `released: Boolean(selectedShop.features?.[key]?.released ?? true),
        enabled: Boolean(selectedShop.features?.[key]?.enabled),`
);

replaceOnce(
  `<h3>Funções liberadas</h3>`,
  `<h3>Funções liberadas por plano</h3><p className="platformMuted">Ative aqui e o recurso aparece automaticamente no lugar certo do painel da barbearia.</p>`
);

if (!source.includes("async function hideShopFromPlatform")) {
  source = source.replace(
    `  async function saveFeatures() {`,
    `  async function hideShopFromPlatform(shop) {
    if (!shop?.slug) return;
    setSaving("hide-" + shop.slug);
    setMessage("");
    try {
      const { error } = await supabase.rpc("archive_platform_barbershop", { target_slug: shop.slug });
      if (error) throw error;
      if (selectedShop?.slug === shop.slug) setSelectedShop(null);
      setMessage("Barbearia removida da lista do painel. Ela continua cadastrada no banco de dados.");
      await loadDashboard();
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setSaving("");
    }
  }

  async function saveFeatures() {`
  );
}

if (!source.includes("Remover da lista")) {
  source = source.replace(
    `<a href={\`/agendamento/\${shop.slug}\`} target="_blank" rel="noreferrer">Link cliente</a>`,
    `<a href={\`/agendamento/\${shop.slug}\`} target="_blank" rel="noreferrer">Link cliente</a>
                  <button type="button" className="platformDanger" disabled={saving === "hide-" + shop.slug} onClick={() => hideShopFromPlatform(shop)}>{saving === "hide-" + shop.slug ? "Removendo..." : "Remover da lista"}</button>`
  );
}

fs.writeFileSync(filePath, source);
console.log("AgendaPro: PlatformDashboard comercial atualizado.");
