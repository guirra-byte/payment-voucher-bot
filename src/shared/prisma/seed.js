const { client } = require("./index.prisma");
const { nanoid } = require("nanoid");
const { formatDate } = require("../../helpers/format-date");

// TODO: Seed deve ser rodado todo início de mês;

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
