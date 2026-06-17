export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Método não permitido');
    
    const { token } = req.body;
    const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

    try {
        const response = await fetch("https://api.mercadopago.com/v1/payments", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
                "X-Idempotency-Key": token
            },
            body: JSON.stringify({
                transaction_amount: 1, // Valor alterado para teste
                description: "QRforma Pro - Acesso Vitalício",
                payment_method_id: "pix",
                payer: { email: "cliente@qrforma.com.br" }, // Email padrão para aprovação
                external_reference: token // Amarra o pagamento ao navegador do cliente
            })
        });

        const data = await response.json();
        
        if (!response.ok) throw new Error(data.message || 'Erro no Mercado Pago');

        res.status(200).json({
            qr_code: data.point_of_interaction.transaction_data.qr_code,
            qr_code_base64: data.point_of_interaction.transaction_data.qr_code_base64
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao gerar PIX" });
    }
}