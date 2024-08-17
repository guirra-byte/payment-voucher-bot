const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { client: prismaClient } = require("./shared/prisma/index.prisma");
const { nanoid } = require("nanoid");
const path = require("node:path");
const { Worker } = require("node:worker_threads");


/* TODO: Implementar lógica de Workers Pool -> controlar o número de instâncias globais */
const client = new Client({
  authStrategy: new LocalAuth(),
});

client.on("ready", () => {
  console.log("WhatsApp client is ready!");
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("message", async (msg) => {
  const chat = await msg.getChat();
  const commandPattern =
    /!nome\s+([a-zA-Z\s]+)\s+!estagio\s+(Recruit|Intern|Shaper)/i;

  let paymentOwner = {};
  const match = msg.body.match(commandPattern);
  if (match) {
    const name = match[1].trim();
    const stage = match[2].trim();
    const getContactName = (await msg.getContact()).name;

    if (!getContactName) {
      paymentOwner.name = name;
      paymentOwner.stage = stage;
    }
  }

  if (paymentOwner === "") {
    client.sendMessage(chat.id, {
      body: `Envie seu nome completo seguido do comando !nome e
      seu estágio no curso Lifeshapers seguido do
      comando !estagio. Ex: *!nome* Matheus Guirra Sousa *!estagio* Intern`,
    });
  }

  if (msg.hasMedia && paymentOwner.name !== "") {
    const getPayer = async (chatId, contact) => {
      return await prismaClient.payers.findUnique({
        where: {
          whatsappChatId: chatId,
          contact,
        },
      });
    };

    const notedContact = await getPayer(chat.id, paymentOwner);
    if (notedContact) {
      const downloadMediaWorkerPath = path.resolve("./download-task.js");

      const downloadMediaWorker = new Worker(downloadMediaWorkerPath);
      downloadMediaWorker.postMessage(JSON.stringify(msg));
    } else if (!notedContact) {
      client.client.sendMessage(chat.id, {
        body: "Envie em qual estágio do Programa Lifeshaper você faz parte seguido do comando !estagio. Ex: !estagio Recruit",
      });
    }
  }
});

client.on("message", async (msg) => {
  if (msg.body === "!nome") {
  }
});

client.initialize();
