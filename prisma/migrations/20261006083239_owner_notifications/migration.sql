-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS');

-- AlterTable
ALTER TABLE "HotelSettings" ADD COLUMN     "notificationPhone" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "notifyEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifySms" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "event" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationLog_createdAt_idx" ON "NotificationLog"("createdAt");
