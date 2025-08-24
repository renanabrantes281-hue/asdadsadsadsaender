require("dotenv").config();
const { Client } = require("discord.js-selfbot-v13");
const axios = require("axios");

// Variáveis do .env
const token = process.env.DISCORD_TOKEN;
const webhookLow = process.env.OUTPUT_WEBHOOK_LOW;   // Para < 10M
const webhookHigh = process.env.OUTPUT_WEBHOOK_HIGH; // Para >= 10M

// IDs dos canais que serão monitorados
const monitorChannelIds = [
  "1397492388204777492",
  "1397492388204777492"
];

// Nomes que mencionam todos
const mentionEveryoneNames = [
  "Garama and Madundung",
  "Dragon Cannelloni",
];

const client = new Client();

client.on("ready", () => {
  console.log(`✅ Logado como ${client.user.tag}`);
});

client.on("messageCreate", async (msg) => {
  try {
    // Só pega mensagens dos canais certos e vindas de webhook
    if (!monitorChannelIds.includes(msg.channel.id) || !msg.webhookId) return;
    if (!msg.embeds.length) return;

    const embed = msg.embeds[0];
    const fields = embed.fields || [];

    // Função para pegar campo
    const getFieldValue = (name) => {
      const field = fields.find(f => f.name.toLowerCase().includes(name.toLowerCase()));
      return field ? field.value : "N/A";
    };

    // Pega nomes
    let namesRaw = getFieldValue("name");
    if (namesRaw === "N/A") return;
    let namesList = namesRaw.split(",").map(n => n.trim());

    // Pega valores de dinheiro
    const moneyRaw = getFieldValue("Generation");
    if (!moneyRaw || moneyRaw === "N/A") return;

    // Converte todos os valores para número puro
    const moneyList = moneyRaw.split(",").map(m => {
      m = m.trim().toUpperCase();
      let value = parseFloat(m.replace(/[^0-9.]/g, "")) || 0;
      if (m.includes("M")) value *= 1_000_000;
      else if (m.includes("K")) value *= 1_000;
      return value;
    });

    const players = getFieldValue("players");
    const jobMobile = getFieldValue("mobile").replace(/`/g, "") || "N/A";
    const jobPC = getFieldValue("pc").replace(/`/g, "") || "N/A";
    const scriptJoinPC = `game:GetService("TeleportService"):TeleportToPlaceInstance(109983668079237, "${jobMobile}", game.Players.LocalPlayer)`;

    // ---- Separa pets por High e Low ----
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

    // Função para formatar valores
    const formatMoney = (num) => {
      if (num >= 1_000_000) return `${Math.round(num / 1_000_000)}M/s`;
      if (num >= 1_000) return `${Math.round(num / 1_000)}K/s`;
      return `${num}/s`;
    };

    // Função para enviar embed
    const sendEmbed = (pets, targetWebhook) => {
      if (!pets.length) return;

      const embedToSend = {
        title: "Shadow Hub Pet Finder",
        color: 0x9152f8,
        description: `Found **${pets.length}** pet(s): ${pets.map(p => p.name).join(" , ")}`,
        fields: [
          {
            name: "🏷️ Name",
            value: pets.map(p => p.name).join(" , "),
            inline: false
          },
          {
            name: "💰 Generation",
            value: pets.map(p => formatMoney(p.money)).join(" , "),
            inline: false
          },
          { name: "👥 Players", value: `**${players}**`, inline: true },
          { name: "🔢 Job ID (Mobile)", value: jobMobile, inline: false },
          { name: "🔢 Job ID (PC)", value: `\`\`\`${jobPC}\`\`\``, inline: false },
          { name: "🔗 Script Join (PC)", value: `\`\`\`lua\n${scriptJoinPC}\n\`\`\``, inline: false },
        ],
        timestamp: new Date(),
        footer: {
          text: "SHADOW HUB ON TOP",
          icon_url: "https://i.pinimg.com/1200x/14/37/4f/14374f6454e77e82c48051a3bb61dd9c.jpg"
        },
      };

      const payload = { embeds: [embedToSend] };
      if (mentionEveryone) payload.content = "@everyone";

      axios.post(targetWebhook, payload)
        .then(() => console.log(`📨 Enviado ${pets.length} pets para ${targetWebhook === webhookHigh ? "HIGH" : "LOW"}`))
        .catch(err => console.error("❌ Erro webhook:", err.message));
    };

    // Envia os dois grupos separados
    sendEmbed(petsHigh, webhookHigh);
    sendEmbed(petsLow, webhookLow);

  } catch (err) {
    console.error("⚠️ Erro ao processar:", err);
  }
});

client.login(token);
