-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('INQUIRY', 'PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('WEBSITE', 'WALK_IN', 'PHONE', 'WHATSAPP', 'OTHER');

-- AlterTable
ALTER TABLE "HotelSettings" ADD COLUMN     "showPublicAvailability" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "RoomUnit" (
    "id" UUID NOT NULL,
    "roomId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" UUID NOT NULL,
    "guestName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT '',
    "checkIn" DATE NOT NULL,
    "checkOut" DATE NOT NULL,
    "guests" INTEGER NOT NULL DEFAULT 1,
    "roomId" UUID NOT NULL,
    "roomType" TEXT NOT NULL,
    "numberOfRooms" INTEGER NOT NULL DEFAULT 1,
    "source" "BookingSource" NOT NULL DEFAULT 'WALK_IN',
    "status" "ReservationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "amount" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'NPR',
    "adminNotes" TEXT NOT NULL DEFAULT '',
    "inquiryId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservationRoom" (
    "id" UUID NOT NULL,
    "reservationId" UUID NOT NULL,
    "roomUnitId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservationRoom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoomUnit_code_key" ON "RoomUnit"("code");

-- CreateIndex
CREATE INDEX "RoomUnit_roomId_active_sortOrder_idx" ON "RoomUnit"("roomId", "active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "RoomUnit_roomId_name_key" ON "RoomUnit"("roomId", "name");

-- CreateIndex
CREATE INDEX "Reservation_status_checkIn_checkOut_idx" ON "Reservation"("status", "checkIn", "checkOut");

-- CreateIndex
CREATE INDEX "Reservation_roomId_checkIn_checkOut_idx" ON "Reservation"("roomId", "checkIn", "checkOut");

-- CreateIndex
CREATE INDEX "Reservation_checkOut_idx" ON "Reservation"("checkOut");

-- CreateIndex
CREATE INDEX "Reservation_inquiryId_idx" ON "Reservation"("inquiryId");

-- CreateIndex
CREATE INDEX "Reservation_createdAt_idx" ON "Reservation"("createdAt");

-- CreateIndex
CREATE INDEX "ReservationRoom_roomUnitId_idx" ON "ReservationRoom"("roomUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "ReservationRoom_reservationId_roomUnitId_key" ON "ReservationRoom"("reservationId", "roomUnitId");

-- AddForeignKey
ALTER TABLE "RoomUnit" ADD CONSTRAINT "RoomUnit_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "BookingInquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationRoom" ADD CONSTRAINT "ReservationRoom_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationRoom" ADD CONSTRAINT "ReservationRoom_roomUnitId_fkey" FOREIGN KEY ("roomUnitId") REFERENCES "RoomUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
