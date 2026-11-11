-- Owner switch for the guest AI chat (Admin → Settings).
ALTER TABLE "HotelSettings" ADD COLUMN "aiChatEnabled" BOOLEAN NOT NULL DEFAULT true;
