const { parentPort } = require("node:worker_threads");
const Payment = require("./types/payment");
const Replicate = require("replicate");
const { formatDate, nxtMonth, months } = require("./helpers/format-date");
const { client } = require("./shared/prisma/index.prisma");
const { nanoid } = require("nanoid");
const fs = require("node:fs");

const destineRegex = /Associacao Lifeshape do Brasil/;
const amountRegex = /R\$ ?([\d\.]+,\d{2})/;
const dateRegexes = [
  /\b(\d{2}\/\d{2}\/\d{4})\b/, // dd/mm/yyyy
  /\b(\d{4}-\d{2}-\d{2})\b/, // yyyy-mm-dd
  /\b(\d{2}-\d{2}-\d{4})\b/, // dd-mm-yyyy
  /\b(\d{2}\.\d{2}\.\d{4})\b/, // dd.mm.yyyy
  /\b(\d{2} [a-z]{3} \d{4})\b/i, // 05 ago 2024 -> Nubank
];

function extractDate(text) {
  for (let regex of dateRegexes) {
    const match = text.match(regex);
    if (match) {
      return formatDate(match[1]);
    }
  }

  return null;
}

if (parentPort) {
  const replicate = new Replicate();
  parentPort.on("message", async (upcomming_msg) => {
    const data = JSON.parse(upcomming_msg);
    if (data) {
      await replicate
        .run(
          "abiruyt/text-extract-ocr:a524caeaa23495bc9edc805ab08ab5fe943afd3febed884a4f3747aa32e9cd61",
          {
            input: { image: data.imgPath },
          }
        )
        .then(async (reply) => {
          const { output } = reply;
          const currentPaymentId = nanoid();

          const ocrDirPath = path.resolve(__dirname, "../tmp/audit");
          if (!fs.existsSync(ocrDirPath)) {
            fs.mkdir(ocrDirPath, (err) => {
              if (err) throw err;
            });
          }

          const writeStream = fs.createWriteStream(
            `${ocrDirPath}/${currentPaymentId}.json`
          );

          const outputData = {
            id: currentPaymentId,
            output,
          };

          writeStream.write(JSON.stringify(outputData));

          const destine = output.match(destineRegex)[1];
          const amount = output.match(amountRegex)[1];
          const period = extractDate(output);

          if (destine && amount && period) {
            const payer = await client.payer.findUnique({
              where: { name: data.contact },
              include: { payment: true, stage: true },
            });

            if (payer) {
              let remainderToPaid = {};
              const stage = payer.stage;

              if (stage) {
                let paymentStatus = "";

                const lastPayment = payer.payments[payer.payments.length - 1];
                let [month, year] = lastPayment.period.split("/");
                year = month === "dez" ?? Number(year) + 1;

                const nxtPeriod = months[nxtMonth(`${month}/${year}`) - 1];
                if (lastPayment.period !== period && period === nxtPeriod) {
                  if (stage.billingAmount > amount) {
                    paymentStatus = "PARTIAL";

                    const partialPayment = amount - stage.billingAmount;
                    remainderToPaid = {
                      period,
                      credits: partialPayment + lastPayment.credits,
                      status: paymentStatus,
                    };
                  }

                  if (
                    lastPayment.credits > 0 &&
                    stage.billingAmount <= amount
                  ) {
                    paymentStatus = "PAID";

                    const adjustedPayment = amount - lastPayment.credits;
                    const unusedCredits = amount - adjustedPayment;

                    const totalCredits =
                      adjustedPayment < amount
                        ? lastPayment.credits + unusedCredits
                        : lastPayment.credits;

                    remainderToPaid = {
                      period,
                      credits: totalCredits,
                      status: paymentStatus,
                    };
                  }
                }

                const payment = new Payment(
                  data.contact,
                  remainderToPaid.period,
                  {
                    status: remainderToPaid.status,
                    amount,
                    credits: remainderToPaid.credits,
                    stage: payer.stageId,
                  }
                );

                const billing = await client.billings.findUnique({
                  where: {
                    period,
                  },
                });

                let billingId = "";
                if (!billing) {
                  const id = nanoid();
                  await client.billings.create({
                    data: {
                      id,
                      period,
                      classStage,
                    },
                  });

                  billingId = !billing ? id : billing.id;
                }

                await client.payments.create({
                  data: {
                    id: currentPaymentId,
                    amount,
                    period,
                    billingId,
                    status: payment.status(),
                    credits: payment.credits(),
                    whatsappChatId: data.chatId,
                  },
                });
              }
            }
          }
        });
    }
  });
}

/* TODO:
* Consulta de Status - [Comando !status para consultar os meses pendentes, O bot pode fornecer um histórico dos últimos pagamentos efetuados];
* Lembretes de Pagamento - [Envio de Lembretes automáticos para usuários que ainda não efetuaram o pagamento];
* Relatório de Pagamentos - [Criação de um relatório dos usuários que possuem pendências financeiras];
*/
