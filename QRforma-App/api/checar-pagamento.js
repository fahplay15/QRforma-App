export default async function handler(req, res) {
    const { token } = req.query;
    const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

    try {
        const response = await fetch(`https://api.mercadopago.com/v1/payments/search?external_reference=${token}&status=approved`, {
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