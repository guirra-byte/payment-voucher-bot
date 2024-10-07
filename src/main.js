const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { client: prismaClient } = require("./shared/prisma/index.prisma");
const { nanoid } = require("nanoid");
const path = require("node:path");
const { Worker } = require("node:worker_threads");
const fs = require("node:fs");

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

const getPayer = async (chatId, contact) => {
  return await prismaClient.payers.findUnique({
    where: {
      whatsappChatId: chatId,
      contact,
    },
  });
};

client.on("message", async (msg) => {
  const chat = await msg.getChat();
  const commandPattern =
    /!name\s+([a-zA-Z\s]+)\s+!stage\s+(Recruit|Intern|Shaper)/i;

  let paymentOwner = {};
  const match = msg.body.match(commandPattern);
  if (match) {
    const name = match[1].trim();
    const stage = match[2].trim();
    const getContactName = (await msg.getContact()).name;

    if (!getContactName) {
      paymentOwner.name = name;
      paymentOwner.stage = stage;
      paymentOwner.numberPhone = await (await chat.getContact()).getFormattedNumber()
    }
  }

  if (paymentOwner.name === "" && paymentOwner.stage === "") {
    client.sendMessage(chat.id, {
      body: `Envie o comando !name seguido do seu nome completo e o comando !stage
      seguido do seu estágio no curso Lifeshapers.
      Ex: *!name* Matheus Guirra Sousa *!stage* Intern`,
    });
  }

  if (msg.hasMedia && paymentOwner.name !== "" && paymentOwner.stage !== "") {
    const noteContact = async () => {
      const notedContact = await getPayer(chat.id, paymentOwner);
      if (notedContact) {
        const media = await msg.downloadMedia();

        if (media.mimetype === "image/jpeg") {
          const bufferfy = Buffer.from(media.data, "base64");
          const ocrWorkerPath = path.resolve("./extract-media-text.js");

          const ocrWorker = new Worker(ocrWorkerPath);
          writeStream.on("finish", () => {
            ocrWorker.postMessage(
              JSON.stringify({
                chatId: chat.id,
                contact: paymentOwner,
                img: bufferfy,
              })
            );
          });

          writeStream.write(bufferfy);
        }
      } else if (!notedContact) {
        const contact = await (await chat.getContact()).getFormattedNumber();
        const stage = await prismaClient.stages.findUnique({
          where: { name: paymentOwner.stage },
        });

        if (stage) {
          await prismaClient.payers.create({
            data: {
              name: paymentOwner.name,
              stageId: stage.id,
              whatsappChatId: chat.id,
              status: "ACTIVE",
              contact: contact,
            },
          });

          await noteContact();
        } else {
          throw new Error("Cannot find stage!");
        }
      }
    };

    await noteContact();
  }
});

client.initialize();
