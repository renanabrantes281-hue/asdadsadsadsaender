require("dotenv").config();
const express = require("express");
const { Client } = require("discord.js-selfbot-v13");
const axios = require("axios");

// ======================
// CONFIGURAÇÕES DO EXPRESS
// ======================
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bot rodando e servidor ativo!");
});

app.listen(PORT, () => {
  console.log(`Servidor web rodando na porta ${PORT}`);
});

// Auto Ping interno para manter vivo
setInterval(() => {
  axios.get(`http://localhost:${PORT}`)
    .then(() => console.log("🔄 Auto-ping enviado"))
    .catch(() => console.log("⚠️ Falha no auto-ping"));
}, 25000);

// ======================
// VARIÁVEIS DO .ENV
// ======================
const token = process.env.DISCORD_TOKEN;
const webhookLow = process.env.OUTPUT_WEBHOOK_LOW;         // 1M - 9M
const webhookMid = process.env.OUTPUT_WEBHOOK_MID;         // 10M - 40M
const webhookHigh = process.env.OUTPUT_WEBHOOK_HIGH;       // 50M - 90M
const webhookUltra = process.env.OUTPUT_WEBHOOK_ULTRA;     // 100M - 1B+

// ======================
// CONFIGURAÇÕES DE MONITORAMENTO
// ======================
const monitorChannelIds = [
  "1397492388204777492"
];

const client = new Client();

// ======================
// CONJUNTO PARA EVITAR DUPLICADOS
// ======================
const sentPets = new Set();

// ======================
// FUNÇÃO DE FORMATAR VALOR (APENAS INTEIROS)
// ======================
const formatMoney = (value) => {
  value = Math.floor(value); // garante inteiro
  if (value >= 1e9) return Math.floor(value / 1e9) + "B/s";
  if (value >= 1e6) return Math.floor(value / 1e6) + "M/s";
  if (value >= 1e3) return Math.floor(value / 1e3) + "K/s";
  return value + "/s";
};

// ======================
// FUNÇÃO DE ENVIO DE EMBED
// ======================
const sendEmbed = (pets, targetWebhook, title, color, players, jobMobile, jobPC, scriptJoinPC) => {
  if (!pets.length || !targetWebhook) return;

  const imageUrl = "https://media.discordapp.net/attachments/1408963499723329680/1410709871300575353/14374f6454e77e82c48051a3bb61dd9c.jpg";

  const embedToSend = {
    title,
    color,
    description: pets.map((p, i) =>
      `\`${i + 1}\` 🏷️ **${p.name}** ｜ 💰 ${formatMoney(p.money)}`
    ).join("\n"),
    fields: [
      { name: "👥 Players", value: `\`${players}\``, inline: true },
      { name: "📱 Mobile Job", value: `\`${jobMobile}\``, inline: true },
      { name: "💻 PC Job", value: `\`${jobPC}\``, inline: true },
      {
        name: "🚀 Quick Join",
        value: `[👉 Click Here](https://krkrkrkrkrkrkrkrkrkrkrk.github.io/shadowhub.github.io/?placeId=${jobMobile}&gameInstanceId=${jobPC})`,
        inline: false
      },
      {
        name: "💻 Script Join (PC)",
        value: `\`\`\`lua\n${scriptJoinPC}\n\`\`\``,
        inline: false
      }
    ],
    thumbnail: { url: imageUrl },
    timestamp: new Date(),
    footer: {
      text: title,
      icon_url: imageUrl
    }
  };

  const payload = { embeds: [embedToSend] };

  axios.post(targetWebhook, payload)
    .then(() => console.log(`📨 Enviado ${pets.length} pets para ${title}`))
    .catch(err => console.error("❌ Erro webhook:", err.message));
};

// ======================
// LOGIN
// ======================
client.on("ready", () => {
  console.log(`✅ Logado como ${client.user.tag}`);
});

// ======================
// EVENTO DE MONITORAMENTO
// ======================
client.on("messageCreate", async (msg) => {
  try {
    if (!monitorChannelIds.includes(msg.channel.id) || !msg.webhookId || !msg.embeds.length) return;

    const embed = msg.embeds[0];
    const fields = embed.fields || [];

    const getFieldValue = (name) => {
      const field = fields.find(f => f.name.toLowerCase().includes(name.toLowerCase()));
      return field ? field.value : "N/A";
    };

    const namesRaw = getFieldValue("name");
    if (namesRaw === "N/A") return;

    const moneyRaw = getFieldValue("Generation");
    if (!moneyRaw || moneyRaw === "N/A") return;

    const players = getFieldValue("players");
    const jobMobile = (getFieldValue("mobile") || "N/A").replace(/`/g, "");
    const jobPC = (getFieldValue("pc") || "N/A").replace(/`/g, "");
    const scriptJoinPC = `game:GetService("TeleportService"):TeleportToPlaceInstance(109983668079237, "${jobMobile}", game.Players.LocalPlayer)`;

    const namesList = namesRaw.split(",").map(n => n.trim());
    const moneyList = moneyRaw.split(",").map(m => {
      m = m.trim().toUpperCase();
      let value = parseFloat(m.replace(/[^0-9.]/g, "")) || 0;
      if (m.includes("M")) value *= 1_000_000;
      else if (m.includes("K")) value *= 1_000;
      return Math.floor(value);
    });

    const petsBuckets = { low: [], mid: [], high: [], ultra: [] };

    namesList.forEach((name, idx) => {
      const moneyValue = moneyList[idx] || 0;
      const key = `${name}_${moneyValue}`;
      if (sentPets.has(key)) return; // evita duplicados
      sentPets.add(key);

      if (moneyValue >= 1_000_000 && moneyValue < 10_000_000) petsBuckets.low.push({ name, money: moneyValue });
      else if (moneyValue >= 10_000_000 && moneyValue <= 40_000_000) petsBuckets.mid.push({ name, money: moneyValue });
      else if (moneyValue >= 50_000_000 && moneyValue <= 90_000_000) petsBuckets.high.push({ name, money: moneyValue });
      else if (moneyValue >= 100_000_000) petsBuckets.ultra.push({ name, money: moneyValue });
    });

    sendEmbed(petsBuckets.low, webhookLow, "🔮 PETS 1M - 9M", 0x9b59b6, players, jobMobile, jobPC, scriptJoinPC);
    sendEmbed(petsBuckets.mid, webhookMid, "⚡ PETS 10M - 40M", 0x3498db, players, jobMobile, jobPC, scriptJoinPC);
    sendEmbed(petsBuckets.high, webhookHigh, "🔥 PETS 50M - 90M", 0xe67e22, players, jobMobile, jobPC, scriptJoinPC);
    sendEmbed(petsBuckets.ultra, webhookUltra, "💎 PETS 100M+", 0xf1c40f, players, jobMobile, jobPC, scriptJoinPC);

  } catch (err) {
    console.error("⚠️ Erro ao processar:", err);
  }
});

// ======================
// LOGIN NO DISCORD
// ======================
client.login(token);
