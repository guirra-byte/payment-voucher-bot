-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'PARTIAL', 'UNPAID');

-- CreateTable
CREATE TABLE "billings" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "billings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "billing_amount" INTEGER NOT NULL,

    CONSTRAINT "stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "period" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "payer_id" TEXT NOT NULL,
    "billing_id" TEXT NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "whatsapp_chat_id" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,

    CONSTRAINT "payers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stages_name_key" ON "stages"("name");

-- CreateIndex
CREATE UNIQUE INDEX "payers_name_key" ON "payers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "payers_whatsapp_chat_id_key" ON "payers"("whatsapp_chat_id");

-- CreateIndex
CREATE UNIQUE INDEX "payers_contact_key" ON "payers"("contact");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_billing_id_fkey" FOREIGN KEY ("billing_id") REFERENCES "billings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "payers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payers" ADD CONSTRAINT "payers_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
