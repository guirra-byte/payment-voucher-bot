/*
  Warnings:

  - The primary key for the `billings` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `billings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `billing_id` on the `payments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "PayerStatus" AS ENUM ('ACTIVE', 'UNACTIVE');

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_billing_id_fkey";

-- AlterTable
ALTER TABLE "billings" DROP CONSTRAINT "billings_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "billings_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "payers" ADD COLUMN     "status" "PayerStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "billing_id",
ADD COLUMN     "billing_id" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_billing_id_fkey" FOREIGN KEY ("billing_id") REFERENCES "billings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
