require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

// ===== MIDDLEWARES =====
app.use(cors());
app.use(bodyParser.json());

// ===== "BANCO DE DADOS" SIMPLES EM ARQUIVO (PODEMOS TROCAR POR MONGO DEPOIS) =====
const DB_FILE = path.join(__dirname, "db.json");

// carrega DB
function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ devices: {} }, null, 2));
  }
  const raw = fs.readFileSync(DB_FILE);
  return JSON.parse(raw.toString());
}

// salva DB
function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// marca status de um device
function setDeviceStatus(deviceId, statusObj) {
  const db = loadDB();
  db.devices[deviceId] = {
    ...db.devices[deviceId],
    ...statusObj,
    updatedAt: new Date().toISOString()
  };
  saveDB(db);
}

// busca status de device
function getDeviceStatus(deviceId) {
  const db = loadDB();
  return db.devices[deviceId] || null;
}

// ===== ROTA DE TESTE =====
app.get("/", (req, res) => {
  res.json({ ok: true, message: "RF Driver Backend rodando" });
});

// ===== ROTA: FRONTEND PERGUNTA SE O DEVICE ESTÁ LIBERADO =====
// GET /api/status?deviceId=abc123
app.get("/api/status", (req, res) => {
  const deviceId = req.query.deviceId;
  if (!deviceId) {
    return res.status(400).json({ error: "deviceId é obrigatório" });
  }

  const status = getDeviceStatus(deviceId);
  if (!status) {
    return res.json({
      active: false,
      plan: null,
      reason: "Nenhum plano encontrado para este aparelho"
    });
  }

  res.json({
    active: status.active || false,
    plan: status.plan || null,
    nextCharge: status.nextCharge || null,
    mpSubscriptionId: status.mpSubscriptionId || null
  });
});

// ===== ROTA: FRONTEND REGISTRA UM FREEMIUM (24H) =====
// POST /api/freemium
app.post("/api/freemium", (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) {
    return res.status(400).json({ error: "deviceId é obrigatório" });
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  setDeviceStatus(deviceId, {
    active: true,
    plan: "FREE",
    expiresAt
  });

  res.json({
    ok: true,
    plan: "FREE",
    expiresAt
  });
});

// ===== ROTA: FRONTEND REGISTRA ATIVAÇÃO MANUAL APÓS PAGAMENTO ÚNICO =====
// (usamos enquanto não integra a assinatura automática)
app.post("/api/activate-manual", (req, res) => {
  const { deviceId, plan } = req.body;
  if (!deviceId || !plan) {
    return res.status(400).json({ error: "deviceId e plan são obrigatórios" });
  }

  setDeviceStatus(deviceId, {
    active: true,
    plan
  });

  res.json({
    ok: true,
    plan
  });
});

// ===== ROTA DE WEBHOOK DO MERCADO PAGO =====
// Configure no painel do MP: URL -> https://SEU_BACKEND/webhook/mercadopago
app.post("/webhook/mercadopago", async (req, res) => {
  try {
    const data = req.body;

    // Mercado Pago costuma enviar algo como:
    // { "action": "payment.created", "data": { "id": "123456789" }, ... }
    // ou para assinaturas: "subscription_preapproval..."

    console.log("Webhook MP recebido:", JSON.stringify(data));

    // confirme o tipo de evento
    const type = data.type || data.action || "";

    // Exemplo simplificado: se for pagamento aprovado
    // você teria que chamar a API do MP para buscar detalhes
    // e descobrir qual assinatura / deviceId está associado.
    // Aqui vamos só ilustrar a ideia:

    // const paymentId = data.data && data.data.id;
    // if (paymentId) {
    //   const mpResp = await axios.get(
    //     `https://api.mercadopago.com/v1/payments/${paymentId}`,
    //     {
    //       headers: {
    //         Authorization: `Bearer ${MP_ACCESS_TOKEN}`
    //       }
    //     }
    //   );
    //   const payment = mpResp.data;
    //   // Aqui você extrai alguma info que ligue ao deviceId,
    //   // por exemplo em "metadata"
    //   const deviceId = payment.metadata && payment.metadata.deviceId;
    //   if (payment.status === "approved" && deviceId) {
    //     setDeviceStatus(deviceId, {
    //       active: true,
    //       plan: "BASICO",  // ou PREMIUM, PRO, etc
    //       mpPaymentId: paymentId
    //     });
    //   }
    // }

    // Como ainda não ligamos o deviceId aos pagamentos, vamos só responder 200
    res.status(200).send("OK");
  } catch (err) {
    console.error("Erro no webhook MP:", err);
    res.status(500).send("Erro");
  }
});

// ===== START =====
app.listen(PORT, () => {
  console.log(`Servidor RF Driver rodando na porta ${PORT}`);
});
