import fetch from "node-fetch";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Método não permitido" });
    }

    const { token, email } = req.body;

    if (!token) {
        return res.status(400).json({ error: "O token do cliente é obrigatório." });
    }

    // CORREÇÃO 1: Captura o e-mail real enviado pelo front-end
    const payerEmail = email || "cliente@qrforma.com.br";

    // CORREÇÃO 2: Chave de Idempotência Dinâmica (Token + Timestamp)
    // Evita o bug de retornar PIX expirado em cliques subsequentes
    const idempotencyKey = `${token}-${Date.now()}`;

    try {
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
                    email: payerEmail
                },
                // Guardamos o token do navegador aqui para a API de checagem consultar depois
                external_reference: token 
            })
        });

        if (!mpResponse.ok) {
            const errorData = await mpResponse.json();
            console.error("Erro Mercado Pago:", errorData);
            throw new Error("Falha ao gerar cobrança no Mercado Pago.");
        }

        const paymentData = await mpResponse.json();

        // Retorna a chave copia e cola e o QR Code em base64 nativos
        return res.status(200).json({
            qr_code: paymentData.point_of_interaction.transaction_data.qr_code,
            qr_code_base64: paymentData.point_of_interaction.transaction_data.qr_code_base64,
            payment_id: paymentData.id
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}