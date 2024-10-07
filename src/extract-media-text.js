const { parentPort } = require("node:worker_threads");
const Payment = require("./types/payment");
const { formatDate, nxtMonth, months } = require("./helpers/format-date");
const { client } = require("./shared/prisma/index.prisma");
const { nanoid } = require("nanoid");
const { createWorker } = require("tesseract.js");

const destineRegex = /Associacao Lifeshape do Brasil/;
const amountRegex = /R\$ ?([\d\.]+,\d{2})/;
const dateRegexes = [
  /\b(\d{2}\/\d{2}\/\d{4})\b/, // dd/mm/yyyy
  /\b(\d{4}-\d{2}-\d{2})\b/, // yyyy-mm-dd
  /\b(\d{2}-\d{2}-\d{4})\b/, // dd-mm-yyyy
  /\b(\d{2}\.\d{2}\.\d{4})\b/, // dd.mm.yyyy
  /\b(\d{2} [a-z]{3} \d{4})\b/i, // 05 ago 2024 -> Nubank
];

async function recognize(imageUrl) {
  const worker = await createWorker("ptbr");
  const reply = await worker.recognize(imageUrl);
  return reply.data.text;
}

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
  parentPort.on("message", async (upcomming_msg) => {
    const data = JSON.parse(upcomming_msg);

    if (data) {
      // Realizar upload para bucket (S3)
      recognize(data.img).then(async (result) => {
        const destine = result.match(destineRegex)[1];
        const amount = result.match(amountRegex)[1];
        const period = extractDate(result);

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

                if (lastPayment.credits > 0 && stage.billingAmount <= amount) {
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

          const currentStage = await client.stages.findUnique({
            where: { name: data.contact.stage },
          });

          if (currentStage) {
            await client.payer.create({
              name: data.contact.name,
              contact: data.contact.numberPhone,
              whatsappChatId: data.chatId,
              stage: currentStage.id,
            });
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
