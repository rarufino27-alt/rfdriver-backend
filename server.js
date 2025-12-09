require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || "";
const JWT_SECRET = process.env.JWT_SECRET || "segredo-super-simples-mude-depois";

// ===== MIDDLEWARES =====
app.use(cors());
app.use(bodyParser.json());

// ===== "BANCO DE DADOS" EM ARQUIVO (SIMPLES) =====
const DB_FILE = path.join(__dirname, "db.json");

// carrega DB
function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ devices: {}, users: {} }, null, 2));
  }
  const raw = fs.readFileSync(DB_FILE);
  const json = JSON.parse(raw.toString());
  if (!json.devices) json.devices = {};
  if (!json.users) json.users = {};
  return json;
}

// salva DB
function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// gera ID simples
function genId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// ===== MIDDLEWARE DE AUTENTICAÇÃO (JWT) =====
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.substring(7) : null;
  if (!token) {
    return res.status(401).json({ ok: false, message: "Token não informado" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, message: "Token inválido" });
  }
}

// ===== ROTAS BÁSICAS =====
app.get("/", (req, res) => {
  res.json({ ok: true, message: "RF Driver Backend rodando" });
});

// ===== AUTENTICAÇÃO: CADASTRO / LOGIN / ME =====

// validações simples
function validarCPF(cpf) {
  if (!cpf) return false;
  const digitos = cpf.replace(/\D/g, "");
  return digitos.length === 11; // não é validação oficial, mas já filtra
}

function validarEmail(email) {
  if (!email) return false;
  return /\S+@\S+\.\S+/.test(email);
}

// POST /auth/register  { cpf, email, celular, senha }
app.post("/auth/register", (req, res) => {
  try {
    const { cpf, email, celular, senha } = req.body || {};

    if (!cpf || !email || !celular || !senha) {
      return res.status(400).json({ ok: false, message: "Todos os campos são obrigatórios" });
    }
    if (!validarCPF(cpf)) {
      return res.status(400).json({ ok: false, message: "CPF inválido" });
    }
    if (!validarEmail(email)) {
      return res.status(400).json({ ok: false, message: "E-mail inválido" });
    }
    if (senha.length < 4) {
      return res.status(400).json({ ok: false, message: "Senha muito curta" });
    }

    const db = loadDB();
    const cpfLimpo = cpf.replace(/\D/g, "");

    // já existe usuário com esse CPF?
    const jaExiste = Object.values(db.users).find(u => u.cpf === cpfLimpo);
    if (jaExiste) {
      return res.status(400).json({ ok: false, message: "Já existe conta com esse CPF" });
    }

    const passwordHash = bcrypt.hashSync(senha, 10);
    const userId = genId();

    db.users[userId] = {
      id: userId,
      cpf: cpfLimpo,
      email: email.trim().toLowerCase(),
      celular: celular.trim(),
      passwordHash,
      plan: "FREE",        // plano inicial
      planExpiresAt: null, // podemos usar depois
      createdAt: new Date().toISOString()
    };

    saveDB(db);

    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });

    return res.json({
      ok: true,
      token,
      user: {
        id: userId,
        cpf: cpfLimpo,
        email: db.users[userId].email,
        celular: db.users[userId].celular,
        plan: db.users[userId].plan
      }
    });
  } catch (err) {
    console.error("Erro em /auth/register:", err);
    return res.status(500).json({ ok: false, message: "Erro interno" });
  }
});

// POST /auth/login  { cpf, senha }
app.post("/auth/login", (req, res) => {
  try {
    const { cpf, senha } = req.body || {};
    if (!cpf || !senha) {
      return res.status(400).json({ ok: false, message: "CPF e senha são obrigatórios" });
    }

    const cpfLimpo = cpf.replace(/\D/g, "");
    const db = loadDB();
    const user = Object.values(db.users).find(u => u.cpf === cpfLimpo);
    if (!user) {
      return res.status(400).json({ ok: false, message: "Usuário não encontrado" });
    }

    const senhaOk = bcrypt.compareSync(senha, user.passwordHash);
    if (!senhaOk) {
      return res.status(400).json({ ok: false, message: "Senha incorreta" });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });

    return res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        cpf: user.cpf,
        email: user.email,
        celular: user.celular,
        plan: user.plan
      }
    });
  } catch (err) {
    console.error("Erro em /auth/login:", err);
    return res.status(500).json({ ok: false, message: "Erro interno" });
  }
});

// GET /auth/me   (rota protegida)
app.get("/auth/me", authMiddleware, (req, res) => {
  try {
    const db = loadDB();
    const user = db.users[req.userId];
    if (!user) {
      return res.status(404).json({ ok: false, message: "Usuário não encontrado" });
    }
    return res.json({
      ok: true,
      user: {
        id: user.id,
        cpf: user.cpf,
        email: user.email,
        celular: user.celular,
        plan: user.plan,
        planExpiresAt: user.planExpiresAt
      }
    });
  } catch (err) {
    console.error("Erro em /auth/me:", err);
    return res.status(500).json({ ok: false, message: "Erro interno" });
  }
});

// ===== ROTAS ANTIGAS (DISPOSITIVOS / FREEMIUM / PLANOS) =====

// GET /api/status?deviceId=...
app.get("/api/status", (req, res) => {
  const deviceId = req.query.deviceId;
  if (!deviceId) {
    return res.status(400).json({ error: "deviceId é obrigatório" });
  }

  const db = loadDB();
  const status = db.devices[deviceId];
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

// POST /api/freemium
app.post("/api/freemium", (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) {
    return res.status(400).json({ error: "deviceId é obrigatório" });
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const db = loadDB();
  db.devices[deviceId] = {
    ...(db.devices[deviceId] || {}),
    active: true,
    plan: "FREE",
    expiresAt,
    updatedAt: new Date().toISOString()
  };
  saveDB(db);

  res.json({ ok: true, plan: "FREE", expiresAt });
});

// POST /api/activate-manual
app.post("/api/activate-manual", (req, res) => {
  const { deviceId, plan } = req.body;
  if (!deviceId || !plan) {
    return res.status(400).json({ error: "deviceId e plan são obrigatórios" });
  }

  const db = loadDB();
  db.devices[deviceId] = {
    ...(db.devices[deviceId] || {}),
    active: true,
    plan,
    updatedAt: new Date().toISOString()
  };
  saveDB(db);

  res.json({ ok: true, plan });
});

// WEBHOOK MERCADO PAGO (ESQUELETO, PRONTO PARA EVOLUIR)
app.post("/webhook/mercadopago", (req, res) => {
  try {
    const data = req.body;
    console.log("Webhook MP recebido:", JSON.stringify(data));
    // aqui depois ligamos pagamento ↔ usuário (cpf / metadata)
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
