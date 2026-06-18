import admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
    });
}

const db = admin.firestore();

export default async function handler(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Não autorizado." });
    }

    const idToken = authHeader.split("Bearer ")[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userEmail = decodedToken.email;

        // 1. CHCA PRIMEIRO NO BANCO DE DADOS FIRESTORE
        const userDoc = await db.collection("usuarios_pro").doc(userEmail).get();
        if (userDoc.exists && userDoc.data().status_pro === true) {
            return res.status(200).json({ status: "pago" });
        }

        // 2. CASO NÃO ESTEJA NO BANCO, CONSULTA O MERCADO PAGO PARA VER SE ACABOU DE PAGAR
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/search?external_reference=${userEmail}`, {
            headers: { "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}` }
        });
        
        const searchData = await mpRes.json();
        
        // Verifica se existe alguma transação com status aprovado para este e-mail
        const paymentApproved = searchData.results && searchData.results.some(p => p.status === "approved");

        if (paymentApproved) {
            // GRAVA O CLIENTE PERMANENTEMENTE NO BANCO DE DADOS
            await db.collection("usuarios_pro").doc(userEmail).set({
                status_pro: true,
                data_liberacao: admin.firestore.FieldValue.serverTimestamp()
            });
            return res.status(200).json({ status: "pago" });
        }

        return res.status(200).json({ status: "pendente" });

    } catch (error) {
        return res.status(401).json({ error: "Token inválido." });
    }
}