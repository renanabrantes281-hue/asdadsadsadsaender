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
  "1412129468742631525"
];

const client = new Client();

client.on("ready", () => {
  console.log(`✅ Logado como ${client.user.tag}`);
});

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
// FUNÇÃO DE ENVIO DE EMBED MODERNO
// ======================
const sendEmbed = (pets, targetWebhooks, isHigh = false, players, jobMobile, jobPC, scriptJoinPC) => {
  if (!pets.length) return;

  const embedColor = isHigh ? 0xf1c40f : 0x9b59b6;

  // Apenas thumbnail e footer (sem banner)
  const imageUrl = "https://media.discordapp.net/attachments/1408963499723329680/1410709871300575353/14374f6454e77e82c48051a3bb61dd9c.jpg?ex=68b20173&is=68b0aff3&hm=dc295228bc5f5e1af50b317dd6711fa2e5faf974436bb41e9e64b996699cff2f&=&format=webp&width=839&height=839";

  const embedToSend = {
    title: isHigh ? "⚡ HIGH VALUE PETS" : "🔮 LOW VALUE PETS",
    color: embedColor,
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
    if (!msg.embeds.length) return;

    const embed = msg.embeds[0];
    const fields = embed.fields || [];

    const getFieldValue = (name) => {
      const field = fields.find(f => f.name.toLowerCase().includes(name.toLowerCase()));
      return field ? field.value : "N/A";
    };

    const namesRaw = getFieldValue("name");
    if (namesRaw === "N/A") return;
    const namesList = namesRaw.split(",").map(n => n.trim());

    const moneyRaw = getFieldValue("Generation");
    if (!moneyRaw || moneyRaw === "N/A") return;

    const moneyList = moneyRaw.split(",").map(m => {
      m = m.trim().toUpperCase();
      let value = parseFloat(m.replace(/[^0-9.]/g, "")) || 0;
      if (m.includes("M")) value *= 1_000_000;
      else if (m.includes("K")) value *= 1_000;
      return Math.floor(value); // garante inteiro
    });

    const players = getFieldValue("players");
    const jobMobile = (getFieldValue("mobile") || "N/A").replace(/`/g, "");
    const jobPC = (getFieldValue("pc") || "N/A").replace(/`/g, "");
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

