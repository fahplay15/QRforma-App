export default async function handler(req, res) {
    // 1. Garante que só aceita requisições do tipo POST
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Método não permitido" });
    }

    const { token, email } = req.body;

    if (!token) {
        return res.status(400).json({ error: "O token do cliente é obrigatório." });
    }

    // 2. Captura o e-mail (ou usa um padrão caso falhe)
    const payerEmail = email || "cliente@qrforma.com.br";

    // 3. Chave de Idempotência (Garante que cada clique gere um PIX novo)
    const idempotencyKey = `${token}-${Date.now()}`;

    try {
        // O "fetch" agora é nativo, não precisa de importação lá em cima
        const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}`,
                "X-Idempotency-Key": idempotencyKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                transaction_amount: 19.90,
                description: "QRforma Pro - Acesso Permanente",
                payment_method_id: "pix",
                payer: {
                    email: payerEmail,
                    first_name: "Cliente", // Evita bloqueio de dados incompletos no MP
                    last_name: "QRforma"
                },
                external_reference: token 
            })
        });

        const paymentData = await mpResponse.json();

        // Se o Mercado Pago retornar erro (ex: Token inválido)
        if (!mpResponse.ok) {
            console.error("Erro Mercado Pago:", paymentData);
            return res.status(mpResponse.status).json({ error: "Falha na API do MP", detalhes: paymentData });
        }

        // Tudo certo! Retorna a chave do PIX para a tela
        return res.status(200).json({
            qr_code: paymentData.point_of_interaction.transaction_data.qr_code,
            qr_code_base64: paymentData.point_of_interaction.transaction_data.qr_code_base64,
            payment_id: paymentData.id
        });

    } catch (error) {
        console.error("Erro interno no servidor:", error);
        return res.status(500).json({ error: "Erro interno no servidor." });
    }
}