require("dotenv").config();
const { Client } = require("discord.js-selfbot-v13");
const axios = require("axios");

// Variáveis do .env
const token = process.env.DISCORD_TOKEN;
const outputWebhook = process.env.OUTPUT_WEBHOOK;

// IDs dos canais que serão monitorados
const monitorChannelIds = [
  "1397492388204777492",
  "1397492388204777492"
];

// Nomes permitidos
const allowedNames = [
  "La Vacca Saturno Saturnita",
  "Karkerkar Kurkur",
  "Chimpanzini Spiderini",
  "Agarrini la Palini",
  "Los Tralaleritos",
  "Las Tralaleritas",
  "Las Vaquitas Saturnitas",
  "Graipuss Medussi",
  "Chicleteira Bicicleteira",
  "La Grande Combinasion",
  "Los Combinasionas",
  "Nuclearo Dinossauro",
  "Los Hotspotsitos",
  "Torrtuginni Dragonfrutini",
  "Pot Hotspot",
  "Esok Sekolah",
];

// Nomes que mencionam todos
const mentionEveryoneNames = [
  "Garama and Madundung",
  "Dragon Cannelloni",
];

const client = new Client();

client.on("ready", () => {
  console.log(`Logado como ${client.user.tag}`);
});

// Função para enviar Job ID mobile para algum endpoint
async function sendJobIdMobile(jobIdMobile) {
  try {
    await axios.post("ooooooooooooooooo", { jobIdMobile });
    console.log(`Job ID Mobile enviado: ${jobIdMobile}`);
  } catch (err) {
    console.error("Erro enviando jobIdMobile:", err.message);
  }
}

client.on("messageCreate", async (msg) => {
  if (!monitorChannelIds.includes(msg.channel.id)) return;
  if (!msg.webhookId) return;

  try {
    if (!msg.embeds.length) return;
    const embed = msg.embeds[0];
    const fields = embed.fields || [];

    function getFieldValue(name) {
      const field = fields.find(f => f.name.toLowerCase().includes(name.toLowerCase()));
      return field ? field.value : "N/A";
    }

    const name = getFieldValue("name");
    if (!allowedNames.includes(name) && !mentionEveryoneNames.includes(name)) {
      return;
    }

    const money = getFieldValue("Generation");
    const players = getFieldValue("players");
    const jobMobileRaw = getFieldValue("mobile");
    const jobMobile = jobMobileRaw ? jobMobileRaw.replace(/`/g, "") : "N/A";
    const jobPCRaw = getFieldValue("pc");
    const jobPC = jobPCRaw ? jobPCRaw.replace(/`/g, "") : "N/A";

    if (jobMobile !== "N/A") {
      await sendJobIdMobile(jobMobile);
    }

    const scriptJoinPC = `game:GetService("TeleportService"):TeleportToPlaceInstance(109983668079237, "${jobMobile}", game.Players.LocalPlayer)`;

    const newEmbed = {
      title: "Shadow Hub Pet Finder",
      color: 0x9152f8,
      fields: [
        { name: "🏷️ Name", value: `**${name}**`, inline: true },
        { name: "💰 Money Per Sec", value: `**${money}**`, inline: true },
        { name: "👥 Players", value: `**${players}**`, inline: true },
        { name: "🔢 Job ID (Mobile)", value: jobMobile, inline: false },
        { name: "🔢 Job ID (PC)", value: `\`\`\`${jobPC}\`\`\``, inline: false },
        { name: "🔗 Script Join (PC)", value: `\`\`\`lua\n${scriptJoinPC}\n\`\`\``, inline: false },
      ],
      timestamp: new Date(),
      footer: {
        text: "SHADOW HUB ON TOP",
        icon_url: "https://images-ext-1.discordapp.net/external/fgJeoHl6eLNgBgyeAdMT_AecnqNnvhgeIFD0WMK_ZbQ/https/i.pinimg.com/1200x/14/37/4f/14374f6454e77e82c48051a3bb61dd9c.jpg?format=webp&width=847&height=847"
      },
    };

    const payload = { embeds: [newEmbed] };

    if (mentionEveryoneNames.includes(name)) {
      payload.content = "@everyone";
    }

    await axios.post(outputWebhook, payload);

    console.log(`Mensagem enviada: ${name}`);

  } catch (err) {
    console.error("Erro ao processar mensagem:", err);
  }
});

client.login(token);
