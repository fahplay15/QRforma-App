// Instale a biblioteca oficial se ainda não tiver: npm install firebase-admin
import admin from "firebase-admin";

// Inicializa o SDK do Firebase Admin de forma segura no servidor
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // Corrige a quebra de linha da chave privada salva na Vercel
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
    });
}

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

    // Captura o token de autenticação enviado pelo cabeçalho (Header)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Acesso não autorizado. Faça login primeiro." });
    }

    const idToken = authHeader.split("Bearer ")[1];

    try {
        // SERVIDOR VERIFICA SE O TOKEN É REAL E DO GOOGLE
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const payerEmail = decodedToken.email; // E-mail 100% verificado sem fraudes

        const idempotencyKey = `${decodedToken.uid}-${Date.now()}`;

        // Dispara a chamada segura para o Mercado Pago
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
                    first_name: "Cliente",
                    last_name: "QRforma"
                },
                external_reference: payerEmail // Atrelamos a venda diretamente ao e-mail dele
            })
        });

        const paymentData = await mpResponse.json();

        if (!mpResponse.ok) {
            return res.status(500).json({ error: "Erro na API do Mercado Pago", detalhes: paymentData });
        }

        return res.status(200).json({
            qr_code: paymentData.point_of_interaction.transaction_data.qr_code,
            qr_code_base64: paymentData.point_of_interaction.transaction_data.qr_code_base64
        });

    } catch (error) {
        return res.status(401).json({ error: "Sessão expirada. Faça login novamente." });
    }
}