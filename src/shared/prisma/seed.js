const { client } = require("./index.prisma");
const { nanoid } = require("nanoid");
const { formatDate } = require("../../helpers/format-date");

// TODO: Seed deve ser rodado todo início de mês;

(async () => {
  const stages = [
    { name: "RECRUIT", amount: 80 },
    { name: "INTERN", amount: 60 },
    { name: "SHAPER", amount: 40 },
  ];

  const period = formatDate(new Date());
  if (period) {
    const [month, year] = period.split("/");
    if (month === "set") {
      // Update all Lifeshapers stage in course;
      // Remember, the last class (Shapers) get out in application (Remove all in database);
      // Send message to require unpaid billings.
      growStage();
    }

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
