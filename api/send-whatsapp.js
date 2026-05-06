export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ ok: false, error: "Método não permitido." });
  }

  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return response.status(501).json({
      ok: false,
      error:
        "Envio automático do WhatsApp ainda não configurado. Cadastre WHATSAPP_TOKEN e WHATSAPP_PHONE_NUMBER_ID no Vercel.",
    });
  }

  let payload = {};

  try {
    payload = typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
  } catch {
    payload = {};
  }

  const { to, message } = payload;
  const cleanTo = String(to || "").replace(/\D/g, "");
  const body = String(message || "").trim();

  if (cleanTo.length < 10 || !body) {
    return response.status(400).json({
      ok: false,
      error: "Informe o número de destino e a mensagem.",
    });
  }

  const whatsappResponse = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: cleanTo,
        type: "text",
        text: {
          preview_url: false,
          body,
        },
      }),
    }
  );

  const data = await whatsappResponse.json().catch(() => ({}));

  if (!whatsappResponse.ok) {
    return response.status(whatsappResponse.status).json({
      ok: false,
      error: data?.error?.message || "Falha ao enviar WhatsApp.",
      details: data,
    });
  }

  return response.status(200).json({ ok: true, data });
}
