export default async function handler(req, res) {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: "Token do cliente não informado" });
    }

    const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
    if (!MP_ACCESS_TOKEN) {
        console.error("MP_ACCESS_TOKEN não configurado no ambiente");
        return res.status(500).json({ error: "Configuração do servidor incompleta" });
    }

    try {
        const response = await fetch(`https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(token)}&status=approved`, {
            headers: { "Authorization": `Bearer ${MP_ACCESS_TOKEN}` }
        });

        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            res.status(200).json({ status: "pago" });
        } else {
            res.status(200).json({ status: "pendente" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao checar pagamento" });
    }
}