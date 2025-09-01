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
const webhookLow = process.env.OUTPUT_WEBHOOK_LOW;
const webhookHighs = [
  process.env.OUTPUT_WEBHOOK_HIGH,
  process.env.OUTPUT_WEBHOOK_HIGH_2
].filter(Boolean);

// ======================
// CONFIGURAÇÕES DE MONITORAMENTO
// ======================
const monitorChannelIds = [
  "1397492388204777492" // substitua pelo ID do canal que deseja monitorar
];

const client = new Client();

client.on("ready", () => {
  console.log(`✅ Logado como ${client.user.tag}`);
});

// ======================
// FUNÇÃO DE FORMATAR VALOR (APENAS INTEIROS)
// ======================
const formatMoney = (value) => {
  value = Math.floor(value);
  if (value >= 1e9) return Math.floor(value / 1e9) + "B/s";
  if (value >= 1e6) return Math.floor(value / 1e6) + "M/s";
  if (value >= 1e3) return Math.floor(value / 1e3) + "K/s";
  return value + "/s";
};

// ======================
// FUNÇÃO DE ENVIO DE EMBED MODERNO
// ======================
const sendEmbed = (pets, targetWebhooks, isHigh = false, players, jobMobile, jobPC, scriptJoinPC) => {
  if (!pets.length) return;

  const embedColor = isHigh ? 0xf1c40f : 0x9b59b6;
  const imageUrl = "https://media.discordapp.net/attachments/1408963499723329680/1410709871300575353/14374f6454e77e82c48051a3bb61dd9c.jpg";

  const embedToSend = {
    title: isHigh ? "⚡ HIGH VALUE PETS" : "🔮 LOW VALUE PETS",
    color: embedColor,
    description: pets.map((p, i) =>
      `${i + 1} 🏷️ **${p.name}** ｜ 💰 ${formatMoney(p.money)}`
    ).join("\n"),
    fields: [
      { name: "👥 Players", value: `${players}`, inline: true },
     { name: "📳 Job ID (Mobile)", value: jobMobile, inline: false },
      
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
      text: isHigh ? "🔥 Shadow Hub Premium Dashboard" : "⚡ Shadow Hub Finder",
      icon_url: imageUrl
    }
  };

  const payload = { embeds: [embedToSend] };

  targetWebhooks.forEach(webhook => {
    axios.post(webhook, payload)
      .then(() => console.log(`📨 Enviado ${pets.length} pets para webhook: ${webhook}`))
      .catch(err => console.error("❌ Erro webhook:", err.message));
  });
};

// ======================
// EVENTO DE MONITORAMENTO
// ======================
client.on("messageCreate", async (msg) => {
  try {
    if (!monitorChannelIds.includes(msg.channel.id) || !msg.webhookId) return;

    let namesList = [];
    let moneyList = [];
    let players = "N/A";
    let jobMobile = "N/A";
    let jobPC = "N/A";

    // ======================
    // CASO 1: EMBED
    // ======================
    if (msg.embeds.length) {
      const embed = msg.embeds[0];
      const fields = embed.fields || [];
      const getFieldValue = (name) => {
        const field = fields.find(f => f.name.toLowerCase().includes(name.toLowerCase()));
        return field ? field.value : "N/A";
      };

      namesList = (getFieldValue("name") || "").split(",").map(n => n.trim());
      moneyList = (getFieldValue("Generation") || "")
        .split(",")
        .map(m => {
          m = m.trim().toUpperCase();
          let value = parseFloat(m.replace(/[^0-9.]/g, "")) || 0;
          if (m.includes("M")) value *= 1_000_000;
          else if (m.includes("K")) value *= 1_000;
          return Math.floor(value);
        });
      players = getFieldValue("players") || "N/A";
      jobMobile = (getFieldValue("mobile") || "N/A").replace(/\s/g, "");
      jobPC = (getFieldValue("pc") || "N/A").replace(/\s/g, "");
    } 
    // ======================
    // CASO 2: MENSAGEM DE TEXTO
    // ======================
    else if (msg.content) {
      // Exemplo esperado: "Names: X, Y | Money: 10K, 5M | Mobile: 2i149149 | PC: 654321 | Players: 5"
      const match = /Names:\s*(.+?)\s*\|\s*Money:\s*(.+?)\s*\|\s*Mobile:\s*([^|]+)\s*\|\s*PC:\s*([^|]+)\s*\|\s*Players:\s*(\d+)/i.exec(msg.content);
      if (match) {
        namesList = match[1].split(",").map(n => n.trim());
        moneyList = match[2].split(",").map(m => {
          m = m.trim().toUpperCase();
          let value = parseFloat(m.replace(/[^0-9.]/g, "")) || 0;
          if (m.includes("M")) value *= 1_000_000;
          else if (m.includes("K")) value *= 1_000;
          return Math.floor(value);
        });
        jobMobile = match[3].trim();
        jobPC = match[4].trim();
        players = match[5];
      }
    }

    if (!namesList.length) return;

    const scriptJoinPC = `game:GetService("TeleportService"):TeleportToPlaceInstance(109983668079237, "${jobMobile}", game.Players.LocalPlayer)`;

    let petsHigh = [];
    let petsLow = [];

    namesList.forEach((name, idx) => {
      const moneyValue = moneyList[idx] || 0;
      if (moneyValue >= 10_000_000) petsHigh.push({ name, money: moneyValue });
      else petsLow.push({ name, money: moneyValue });
    });

    sendEmbed(petsHigh, webhookHighs, true, players, jobMobile, jobPC, scriptJoinPC);
    sendEmbed(petsLow, [webhookLow], false, players, jobMobile, jobPC, scriptJoinPC);

  } catch (err) {
    console.error("⚠️ Erro ao processar:", err);
  }
});

// ======================
// LOGIN
// ======================
client.login(token);

