const { client } = require("./index.prisma");
const { nanoid } = require("nanoid");
const { formatDate } = require("../../helpers/format-date");
const EfiPay = require("sdk-node-apis-efi");

// TODO: Seed deve ser rodado todo início de mês;

const efiPay = new EfiPay({});
const spliceRegisteredKeys = (pixKeys, webhookUrl) => {
  const unregisteredKeys = [];
  fetch(
    "http://api-pi.gerencianet.com.br/v2/webhook?inicio=2020-10-22T16:01:35Z&fim=2020-10-23T16:01:35Z"
  ).then((reply) => {
    if (reply.status === 200) {
      const { webhooks } = reply;

      for (const webhook of webhooks) {
        const findPixKey = pixKeys.find((pixKey) => webhook.chave === pixKey);
        if (!findPixKey && webhook.webhookUrl.include(webhookUrl)) {
          unregisteredKeys.push(webhook.chave);
        }
      }
    }
  });

  return unregisteredKeys;
};

const registerPixKeyWebhook = (pixKeys) => {
  // Verify on db if pix key webhook url already exists;
  const WEBHOOK_BASE_URL = "";
  const keys = spliceRegisteredKeys(pixKeys, WEBHOOK_BASE_URL);

  const webhooks = keys.map((key) => {
    const webhookUrl = efiPay.pixConfigWebhook(
      { chave: key },
      { webhookUrl: WEBHOOK_BASE_URL }
    );

    return webhookUrl.concat("?ignorar=");
  });

  Promise.allSettled(webhooks).then((_webhooks) => {
    _webhooks.map((_webhook) => {
      if (_webhook.status === "rejected") {
        // Pix key webhook gonna be registered in other time;
      }
    });
  });
};

const pixBatch = async (stage) => {
  client.payer
    .findMany({
      where: {
        stage: stage
      }
    })
    .then((lifeshapers) => {
      const pixChargeBatch = lifeshapers.map((lifeshaper) => {
        return efiPay.pixCreateCharge(
          { txid: "" },
          {
            chave: "",
            valor: "",
            infoAdicionais: [
              {
                nome: lifeshaper.name
              }
            ]
          }
        );
      });

      Promise.allSettled(pixChargeBatch).then((promises) => {
        const pixKeyToWebhook = [];
        promises.map((promise, index) => {
          if (promise.status === "fulfilled") {
            const pixChargeInfo = promise.value;
            pixKeyToWebhook.push(pixChargeInfo.chave);

            if (index === promises.length - 1) {
              registerPixKeyWebhook(pixKeyToWebhook);
            }
          } else {
            // Mark this entity in db to make a reattempt;
          }
        });
      });
    });
};

(async () => {
  const stages = [
    { name: "RECRUIT", amount: 80 },
    { name: "INTERN", amount: 60 },
    { name: "SHAPER", amount: 40 }
  ];

  const period = formatDate(new Date());
  if (period) {
    const [month, year] = period.split("/");
    if (month === "set") {
      const stages = await client.stage.findMany();
      const filterByPendingPayments = await client.payer.findMany({
        where: {
          payments: {
            none: {
              status: "PAID"
            }
          }
        },
        include: {
          payments: {
            where: {
              status: {
                not: "PAID"
              }
            }
          }
        }
      });

      const growRecruit = stages.find((stage) => stage.name === "INTERN");
      await client.payer.updateMany({
        where: { stage: "RECRUIT" },
        data: { stageId: growRecruit.id }
      });

      const growIntern = stages.find((stage) => stage.name === "SHAPER");
      await client.payer.updateMany({
        where: { stage: "INTERN" },
        data: { stageId: growIntern.id }
      });

      const pendingShaperPayments = filterByPendingPayments.filter(
        (payment) => payment.stageId === growIntern.id
      );

      // Update all Lifeshapers stage in course;
      // Remember, the last class (Shapers) get out in application (Remove all in database) after all pending payments was payed;
      // Send message to require unpaid billings.
    }

    for (let stage of stages) {
      const stageAlreadyNoted = await client.stage.findUnique({
        where: {
          stage: stage.name
        }
      });

      if (!stageAlreadyNoted) {
        await client.stage.create({
          id: nanoid(),
          name: stage.name,
          billingAmount: stage.amount
        });
      }

      const periodAlreadyNoted = await client.billing.findUnique({
        where: {
          period,
          stage: stage.name
        }
      });

      if (!periodAlreadyNoted) {
        await client.billing.create({
          where: {
            id: nanoid(),
            period,
            stage: stage.name,
            amount: stage.amount
          }
        });
      }
    }
  }
})();
