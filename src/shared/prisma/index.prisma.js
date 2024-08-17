const PrismaClient = require("prisma");
const prismaClient = new PrismaClient();

module.exports = {
  client: prismaClient,
};
