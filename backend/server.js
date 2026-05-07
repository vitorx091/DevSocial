import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Resend } from "resend";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const resend = new Resend(process.env.RESEND_API_KEY);

// 🔥 CONFIG
const ADMIN_EMAIL = "vitorfidelis091@gmail.com";

// 🔥 CONTROLE DE SPAM (cooldown)
let lastEmailTime = 0;
const COOLDOWN = 60000; // 1 minuto

// 🔥 FUNÇÃO PRA VER SE TÁ OFFLINE
function isUserOffline(lastActive) {
  if (!lastActive) return true;

  const FIVE_MIN = 5 * 60 * 1000;
  return Date.now() - lastActive > FIVE_MIN;
}

// 🔥 ENDPOINT DE EMAIL
app.post("/send-email", async (req, res) => {
  const { message, senderName, type, lastActive } = req.body;

  try {
    // ============================
    // 🔥 VALIDAÇÃO
    // ============================
    if (!type || !senderName) {
      return res.status(400).json({ error: "Dados incompletos" });
    }

    // ============================
    // 🔥 ANTI-SPAM
    // ============================
    const now = Date.now();

    if (now - lastEmailTime < COOLDOWN) {
      return res.status(200).json({ skipped: "Cooldown ativo" });
    }

    // ============================
    // 🔥 VERIFICA SE ESTÁ OFFLINE
    // ============================
    if (!isUserOffline(lastActive)) {
      return res.status(200).json({ skipped: "Usuário online" });
    }

    // ============================
    // 🔥 DEFINIR CONTEÚDO
    // ============================
    let subject = "";
    let html = "";

    if (type === "message") {
      subject = "📩 Nova mensagem no seu portfólio";
      html = `
        <div style="font-family: Arial; padding:20px;">
          <h2>📩 Nova mensagem</h2>
          <p><strong>${senderName}</strong> te enviou:</p>
          <p>"${message || "Mensagem vazia"}"</p>

          <br/>

          <a href="http://localhost:5173/messages"
             style="background:#007bff;color:#fff;padding:10px 15px;text-decoration:none;border-radius:5px;">
             Abrir chat
          </a>
        </div>
      `;
    }

    if (type === "follow") {
      subject = "👤 Novo seguidor";
      html = `
        <div style="font-family: Arial; padding:20px;">
          <h2>🚀 Novo seguidor</h2>
          <p><strong>${senderName}</strong> começou a te seguir</p>

          <br/>

          <a href="http://localhost:5173/profile"
             style="background:#28a745;color:#fff;padding:10px 15px;text-decoration:none;border-radius:5px;">
             Ver perfil
          </a>
        </div>
      `;
    }

    // 🔥 SEGURANÇA FINAL
    if (!subject) {
      return res.status(400).json({ error: "Tipo inválido" });
    }

    // ============================
    // 🔥 ENVIO
    // ============================
    await resend.emails.send({
      from: "DevSocial <onboarding@resend.dev>",
      to: ADMIN_EMAIL,
      subject,
      html,
    });

    lastEmailTime = now;

    console.log("✅ Email enviado:", type);

    res.status(200).json({ success: true });

  } catch (err) {
    console.error("❌ Erro ao enviar email:", err);
    res.status(500).json({ error: "Erro ao enviar email" });
  }
});

// ============================
// 🔥 START SERVER
// ============================
app.listen(3001, () => {
  console.log("🔥 Backend rodando na porta 3001");
});