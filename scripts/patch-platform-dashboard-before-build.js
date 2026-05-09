const fs = require("fs");
const path = require("path");

const filePath = path.join(process.cwd(), "PlatformDashboard.tsx");
let source = fs.readFileSync(filePath, "utf8");

function replaceOnce(search, replacement) {
  if (!source.includes(search)) throw new Error(`Trecho não encontrado: ${search.slice(0, 80)}`);
  source = source.replace(search, replacement);
}

// Chaves usadas pelo fluxo comercial e pelo App.tsx.
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

source = source.replace(/theme_color: "#22c55e",\n  \};/, `theme_color: "#22c55e",
    plan_price: 89,
  };`);

// Valor mensal no cadastro.
replaceOnce(
  `<label>Vencimento</label>\n            <input value={newShop.next_billing_date} onChange={(event) => updateNewShop("next_billing_date", event.target.value)} type="date" />`,
  `<div className="platformTwoCols">
              <span><label>Vencimento</label><input value={newShop.next_billing_date} onChange={(event) => updateNewShop("next_billing_date", event.target.value)} type="date" /></span>
              <span><label>Valor mensal</label><input value={newShop.plan_price || ""} onChange={(event) => updateNewShop("plan_price", event.target.value)} type="number" min="0" step="1" placeholder="89" /></span>
            </div>`
);

// Valor mensal no editor.
replaceOnce(
  `<label>Vencimento</label><input value={selectedShop.next_billing_date || ""} onChange={(event) => updateSelected("next_billing_date", event.target.value)} type="date" />`,
  `<div className="platformTwoCols">
                <span><label>Vencimento</label><input value={selectedShop.next_billing_date || ""} onChange={(event) => updateSelected("next_billing_date", event.target.value)} type="date" /></span>
                <span><label>Valor mensal</label><input value={selectedShop.plan_price ?? ""} onChange={(event) => updateSelected("plan_price", event.target.value)} type="number" min="0" step="1" placeholder="89" /></span>
              </div>`
);

// Ao criar barbearia, grava o valor mensal logo depois da RPC principal.
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

// Ao editar barbearia, envia plan_price_input.
replaceOnce(
  `theme_color_input: selectedShop.theme_color || "#22c55e",\n      });`,
  `theme_color_input: selectedShop.theme_color || "#22c55e",
        plan_price_input: Number(selectedShop.plan_price || 0),
      });`
);

replaceOnce(
  `released: Boolean(selectedShop.features?.[key]?.released),\n        enabled: Boolean(selectedShop.features?.[key]?.enabled),`,
  `released: Boolean(selectedShop.features?.[key]?.released ?? true),
        enabled: Boolean(selectedShop.features?.[key]?.enabled),`
);

replaceOnce(
  `<h3>Funções liberadas</h3>`,
  `<h3>Funções liberadas por plano</h3><p className="platformMuted">Ative aqui e o recurso aparece automaticamente no lugar certo do painel da barbearia.</p>`
);

fs.writeFileSync(filePath, source);
console.log("AgendaPro: PlatformDashboard com valor mensal editável e funções comerciais corrigidas.");
