const { client } = require("./index.prisma");
const { nanoid } = require("nanoid");
const { formatDate } = require("../../helpers/format-date");

// TODO: Seed deve ser rodado todo início de mês;

(async () => {
  const stages = [
    { name: "RECRUITS", amount: 80 },
    { name: "INTERNS", amount: 60 },
    { name: "SHAPERS", amount: 40 },
  ];

  const period = formatDate(new Date());
  if (period) {
    for (let stage of stages) {
      const stageAlreadyNoted = await client.stage.findUnique({
        where: {
          stage: stage.name,
        },
      });

      if (!stageAlreadyNoted) {
        await client.stage.create({
          id: nanoid(),
          name: stage.name,
          billingAmount: stage.amount,
        });
      }

      const periodAlreadyNoted = await client.billing.findUnique({
        where: {
          period,
          stage: stage.name,
        },
      });

      if (!periodAlreadyNoted) {
        await client.billing.create({
          where: {
            id: nanoid(),
            period,
            stage: stage.name,
            amount: stage.amount,
          },
        });
      }
    }
  }
})();
