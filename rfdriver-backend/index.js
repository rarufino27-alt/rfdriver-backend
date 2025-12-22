import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mercadopago from "mercadopago";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN
});

/* ===============================
   ROTAS BÁSICAS
================================ */

app.get("/", (req, res) => {
  res.send("RF Driver Backend OK");
});

/* ===============================
   CRIAR CHECKOUT
================================ */

app.post("/create-preference", async (req, res) => {
  const { plano, email } = req.body;

  const planos = {
    mensal: { title: "Plano Mensal RF Driver", price: 24.9 },
    semestral: { title: "Plano Semestral RF Driver", price: 124.9 },
    vitalicio: { title: "Plano Vitalício RF Driver", price: 299.9 }
  };

  if (!planos[plano]) {
    return res.status(400).json({ error: "Plano inválido" });
  }

  try {
    const preference = {
      items: [
        {
          title: planos[plano].title,
          quantity: 1,
          unit_price: planos[plano].price
        }
      ],
      payer: {
        email
      },
      back_urls: {
        success: "https://SEU_SITE/index.html",
        failure: "https://SEU_SITE/planos.html",
        pending: "https://SEU_SITE/planos.html"
      },
      auto_return: "approved",
      notification_url: "https://SEU_BACKEND/webhook/mercadopago",
      metadata: {
        plano,
        email
      }
    };

    const response = await mercadopago.preferences.create(preference);
    res.json({ init_point: response.body.init_point });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar checkout" });
  }
});

/* ===============================
   WEBHOOK MERCADO PAGO
================================ */

app.post("/webhook/mercadopago", (req, res) => {
  const payment = req.body;

  console.log("Webhook recebido:", payment);

  // A liberação do plano virá no próximo passo
  res.sendStatus(200);
});

/* ===============================
   START SERVER
================================ */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Backend rodando na porta", PORT);
});
