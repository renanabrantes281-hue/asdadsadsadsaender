require("dotenv").config();
const express = require("express");
const { Client } = require("discord.js-selfbot-v13");
const axios = require("axios");

// Configurações do Express
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

// Variáveis do .env
const token = process.env.DISCORD_TOKEN;
const webhookLow = process.env.OUTPUT_WEBHOOK_LOW;

// Suporta múltiplos webhooks HIGH separados por vírgula
const webhookHighs = process.env.OUTPUT_WEBHOOK_HIGH.split(",").map(w => w.trim());

// Canais monitorados
const monitorChannelIds = [
  "1397492388204777492"
];

// Nomes que mencionam everyone
const mentionEveryoneNames = [
  "Garama and Madundung",
  "Dragon Cannelloni"
];

const client = new Client();

client.on("ready", () => {
  console.log(`✅ Logado como ${client.user.tag}`);
});

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
      return value;
    });

    const players = getFieldValue("players");
    const jobMobile = (getFieldValue("mobile") || "N/A").replace(/`/g, "");
    const jobPC = (getFieldValue("pc") || "N/A").replace(/`/g, "");
    const scriptJoinPC = `game:GetService("TeleportService"):TeleportToPlaceInstance(109983668079237, "${jobMobile}", game.Players.LocalPlayer)`;

    let petsHigh = [];
    let petsLow = [];
    let mentionEveryone = false;

    namesList.forEach((name, idx) => {
      const moneyValue = moneyList[idx] || 0;
      if (mentionEveryoneNames.includes(name)) mentionEveryone = true;

      if (moneyValue >= 10_000_000) {
        petsHigh.push({ name, money: moneyValue });
      } else {
        petsLow.push({ name, money: moneyValue });
      }
    });

    const formatMoney = (num) => {
      if (num >= 1_000_000) return `${Math.round(num / 1_000_000)}M/s`;
      if (num >= 1_000) return `${Math.round(num / 1_000)}K/s`;
      return `${num}/s`;
    };

    const sendEmbed = (pets, targetWebhooks) => {
      if (!pets.length) return;

      const placeId = jobMobile;
      const gameInstanceId = jobPC;

      const embedToSend = {
        title: "Shadow Hub Pet Finder",
        color: 0x9152f8,
        description: `Found **${pets.length}** pet(s): ${pets.map(p => p.name).join(", ")}`,
        fields: [
          { name: "🏷️ Name", value: pets.map(p => p.name).join(", "), inline: false },
          { name: "💰 Generation", value: pets.map(p => formatMoney(p.money)).join(", "), inline: false },
          { name: "👥 Players", value: `**${players}**`, inline: true },
          { name: "🔢 Job ID (Mobile)", value: placeId, inline: false },
          { name: "🔢 Job ID (PC)", value: `\`\`\`${gameInstanceId}\`\`\``, inline: false },
          { name: "🔗 Script Join (PC)", value: `\`\`\`lua\n${scriptJoinPC}\n\`\`\``, inline: false },
          { name: "🚀 Click for Join", value: `[Click for join](https://krkrkrkrkrkrkrkrkrkrkrk.github.io/shadowhub.github.io/?placeId=${placeId}&gameInstanceId=${gameInstanceId})`, inline: false }
        ],
        timestamp: new Date(),
        footer: { text: "SHADOW HUB ON TOP", icon_url: "https://i.pinimg.com/1200x/14/37/4f/14374f6454e77e82c48051a3bb61dd9c.jpg" },
      };

      const payload = { embeds: [embedToSend] };

      targetWebhooks.forEach(webhook => {
        axios.post(webhook, payload)
          .then(() => console.log(`📨 Enviado ${pets.length} pets para webhook: ${webhook}`))
          .catch(err => console.error("❌ Erro webhook:", err.message));
      });
    };

    // Envio para webhooks
    sendEmbed(petsHigh, webhookHighs);
    sendEmbed(petsLow, [webhookLow]);

  } catch (err) {
    console.error("⚠️ Erro ao processar:", err);
  }
});

client.login(token);
