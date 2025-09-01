require("dotenv").config();
const express = require("express");
const { Client } = require("discord.js-selfbot-v13");
const axios = require("axios");

// ======================
// EXPRESS SERVER
// ======================
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (_, res) => res.send("Bot rodando e servidor ativo!"));

app.listen(PORT, () => {
  console.log(`🚀 Servidor web rodando na porta ${PORT}`);
});

// Mantém o bot vivo com auto-ping
setInterval(() => {
  axios.get(`http://localhost:${PORT}`)
    .then(() => console.log("🔄 Auto-ping enviado"))
    .catch(() => console.warn("⚠️ Falha no auto-ping"));
}, 25000);

// ======================
// VARIÁVEIS DO .ENV
// ======================
const token = process.env.DISCORD_TOKEN;

const webhooks = {
  low: process.env.OUTPUT_WEBHOOK_LOW,       // 1M - 9M
  mid: process.env.OUTPUT_WEBHOOK_MID,       // 10M - 40M
  high: process.env.OUTPUT_WEBHOOK_HIGH,     // 50M - 90M
  ultra: process.env.OUTPUT_WEBHOOK_ULTRA    // 100M+
};

// ======================
// CONFIGURAÇÕES DE MONITORAMENTO
// ======================
const monitorChannelIds = ["1397492388204777492"];
const client = new Client();

client.on("ready", () => {
  console.log(`✅ Logado como ${client.user.tag}`);
});

// ======================
// FUNÇÕES AUXILIARES
// ======================

// Formata valores numéricos em K/M/B
const formatMoney = (value) => {
  value = Math.floor(value);
  if (value >= 1e9) return Math.floor(value / 1e9) + "B/s";
  if (value >= 1e6) return Math.floor(value / 1e6) + "M/s";
  if (value >= 1e3) return Math.floor(value / 1e3) + "K/s";
  return value + "/s";
};

// Envia embed para um webhook
const sendEmbed = async (pets, webhookUrl, title, color, players, jobMobile, jobPC, scriptJoinPC) => {
  if (!pets.length || !webhookUrl) return;

  const imageUrl = "https://media.discordapp.net/attachments/1408963499723329680/1410709871300575353/14374f6454e77e82c48051a3bb61dd9c.jpg";

  const embed = {
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
    footer: { text: title, icon_url: imageUrl }
  };

  try {
    await axios.post(webhookUrl, { embeds: [embed] });
    console.log(`📨 Enviado ${pets.length} pets para [${title}]`);
  } catch (err) {
    console.error(`❌ Erro ao enviar para webhook [${title}]:`, err.message);
  }
};

// Classifica pets em categorias de acordo com o valor
const categorizePets = (names, moneyValues) => {
  const categories = {
    low: [],   // 1M - 9M
    mid: [],   // 10M - 40M
    high: [],  // 50M - 90M
    ultra: []  // 100M+
  };

  names.forEach((name, i) => {
    const money = moneyValues[i] || 0;

    if (money >= 1_000_000 && money < 10_000_000) categories.low.push({ name, money });
    else if (money >= 10_000_000 && money <= 40_000_000) categories.mid.push({ name, money });
    else if (money >= 50_000_000 && money <= 90_000_000) categories.high.push({ name, money });
    else if (money >= 100_000_000) categories.ultra.push({ name, money });
  });

  return categories;
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
    const names = namesRaw.split(",").map(n => n.trim());

    const moneyRaw = getFieldValue("Generation");
    if (!moneyRaw || moneyRaw === "N/A") return;
    const moneyValues = moneyRaw.split(",").map(m => {
      m = m.trim().toUpperCase();
      let value = parseFloat(m.replace(/[^0-9.]/g, "")) || 0;
      if (m.includes("M")) value *= 1_000_000;
      else if (m.includes("K")) value *= 1_000;
      return Math.floor(value);
    });

    const players = getFieldValue("players");
    const jobMobile = (getFieldValue("mobile") || "N/A").replace(/`/g, "");
    const jobPC = (getFieldValue("pc") || "N/A").replace(/`/g, "");
    const scriptJoinPC = `game:GetService("TeleportService"):TeleportToPlaceInstance(109983668079237, "${jobMobile}", game.Players.LocalPlayer)`;

    // Classificação automática
    const categories = categorizePets(names, moneyValues);

    // Envia cada categoria
    await sendEmbed(categories.low, webhooks.low, "🔮 PETS 1M - 9M", 0x9b59b6, players, jobMobile, jobPC, scriptJoinPC);
    await sendEmbed(categories.mid, webhooks.mid, "⚡ PETS 10M - 40M", 0x3498db, players, jobMobile, jobPC, scriptJoinPC);
    await sendEmbed(categories.high, webhooks.high, "🔥 PETS 50M - 90M", 0xe67e22, players, jobMobile, jobPC, scriptJoinPC);
    await sendEmbed(categories.ultra, webhooks.ultra, "💎 PETS 100M+", 0xf1c40f, players, jobMobile, jobPC, scriptJoinPC);

    // Log resumido
    console.log(
      `📊 Classificação: Low(${categories.low.length}) | Mid(${categories.mid.length}) | High(${categories.high.length}) | Ultra(${categories.ultra.length})`
    );

  } catch (err) {
    console.error("⚠️ Erro ao processar mensagem:", err);
  }
});

// ======================
// LOGIN
// ======================
client.login(token);
