const { parentPort } = require("node:worker_threads");
const Payment = require("./types/payment");
const { formatDate, nxtMonth, months } = require("./helpers/format-date");
const { client } = require("./shared/prisma/index.prisma");
const { nanoid } = require("nanoid");
const { createWorker } = require("tesseract.js");
const fs = require("node:fs");
const path = require("node:path");

const destineRegex = /Associacao Lifeshape do Brasil/;
const amountRegex = /R\$ ?([\d\.]+,\d{2})/;
const dateRegexes = [
  /\b(\d{2}\/\d{2}\/\d{4})\b/, // dd/mm/yyyy
  /\b(\d{4}-\d{2}-\d{2})\b/, // yyyy-mm-dd
  /\b(\d{2}-\d{2}-\d{4})\b/, // dd-mm-yyyy
  /\b(\d{2}\.\d{2}\.\d{4})\b/, // dd.mm.yyyy
  /\b(\d{2} [a-z]{3} \d{4})\b/i // 05 ago 2024 -> Nubank
];

async function recognize(imageUrl) {
  const worker = await createWorker("ptbr");
  const reply = await worker.recognize(imageUrl);
  return reply.data.text;
}

async function saveMediaLocally(base64, mimetype) {
  const filename = nanoid();
  const base64Data = data.img.replace(/^data:image\/\w+;base64,/, "");
  const localMediaDir = path.resolve(__dirname, "..", "tmp/audit");

  const filepath = `${localMediaDir}/${filename}.${mimetype}`;

  let success = false;
  fs.writeFile(filepath, base64Data, (err) => {
    if (err) throw err;
    success = true;
  });

  if (success) {
    return filepath;
  }

  return undefined;
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
      const localMedia = await saveMediaLocally(data.img, data.mimetype);
      if (!localMedia) {
        throw new Error("Cannot save media locally!");
      }

      recognize(localMedia).then(async (result) => {
        const destine = result.match(destineRegex)[1];
        const amount = result.match(amountRegex)[1];
        const period = extractDate(result);

        if (destine && amount && period) {
          const payer = await client.payer.findUnique({
            where: { name: data.contact },
            include: { payment: true, stage: true }
          });

          if (payer) {
            let remainderToPaid = {};
            const stage = await client.stage.findUnique({
              where: {
                id: payer.stageId
              }
            });

            if (stage) {
              let paymentStatus = "";

              const lastPayment = payer.payments[payer.payments.length - 1];
              let [month, year] = lastPayment.period.split("/");
              year = month === "dez" ?? Number(year) + 1;

              const nxtPeriod = months[nxtMonth(`${month}/${year}`) - 1];
              if (lastPayment.period !== period && period === nxtPeriod) {
                if (stage.billingAmount > amount) {
                  paymentStatus = "PARTIAL";

                  const partialPayment = stage.billingAmount - amount;
                  remainderToPaid = {
                    period,
                    credits: partialPayment + lastPayment.credits,
                    status: paymentStatus
                  };
                } else if (stage.billingAmount === amount) {
                  paymentStatus = "PAID";
                  remainderToPaid = {
                    period,
                    credits: 0,
                    status: paymentStatus
                  };
                }

                if (stage.billingAmount <= amount) {
                  paymentStatus = "PAID";
                  const credits = amount - stage.billingAmount;
                  const notedCredits = lastPayment.credits + credits;

                  if (notedCredits === stage.billingAmount) {
                    // Next billing has been paid;
                    const monthsPaidByCredits =
                      notedCredits / stage.billingAmount;

                    const billings = await client.billing.findMany({
                      where: { stage: stage }
                    });

                    const periodBilling = billings.find(
                      (billing) => billing.period === nxtPeriod
                    );

                    if (!periodBilling) {
                      throw new Error("Period Billing not found!");
                    }

                    const paidByCredits = [];
                    for (let index = 0; index < monthsPaidByCredits; index++) {
                      const { id } = periodBilling;
                      const nxtBillingIndex = id + index;
                      const getNxtBilling = billings[nxtBillingIndex];

                      if (!getNxtBilling) {
                      }

                      paidByCredits.push(getNxtBilling.id);
                    }

                    await client.payment.updateMany({
                      where: {
                        payer_id: payer.id,
                        billingId: { in: { paidByCredits } }
                      },
                      data: {
                        status: "PAID",
                        credits: 0
                      }
                    });
                  }

                  const adjustedPayment = amount - lastPayment.credits;
                  const unusedCredits = amount - adjustedPayment;s

                  const totalCredits =
                    adjustedPayment < amount
                      ? lastPayment.credits + unusedCredits
                      : lastPayment.credits;

                  remainderToPaid = {
                    period,
                    credits: totalCredits,
                    status: paymentStatus
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
                  stage: payer.stageId
                }
              );

              const billing = await client.billing.findUnique({
                where: {
                  period
                }
              });

              let billingId = "";
              if (!billing) {
                const id = nanoid();
                await client.billing.create({
                  data: {
                    id,
                    period,
                    classStage
                  }
                });

                billingId = !billing ? id : billing.id;
              }

              await client.payment.create({
                data: {
                  id: currentPaymentId,
                  amount,
                  period,
                  billingId,
                  status: payment.status(),
                  credits: payment.credits(),
                  whatsappChatId: data.chatId
                }
              });
            }
          } else {
            // Create Payer on database
          }

          const currentStage = await client.stage.findUnique({
            where: { name: data.contact.stage }
          });

          if (currentStage) {
            await client.payer.create({
              name: data.contact.name,
              contact: data.contact.numberPhone,
              whatsappChatId: data.chatId,
              stage: currentStage.id
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
