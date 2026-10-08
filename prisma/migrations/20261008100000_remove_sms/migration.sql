-- SMS alerts were removed from the app: drop their settings columns and the SMS delivery-log type.
-- Historical SMS log rows are deleted first (they could not be converted to the email-only type).
DELETE FROM "NotificationLog" WHERE "channel" = 'SMS';

-- AlterEnum
BEGIN;
CREATE TYPE "NotificationChannel_new" AS ENUM ('EMAIL');
ALTER TABLE "NotificationLog" ALTER COLUMN "channel" TYPE "NotificationChannel_new" USING ("channel"::text::"NotificationChannel_new");
ALTER TYPE "NotificationChannel" RENAME TO "NotificationChannel_old";
ALTER TYPE "NotificationChannel_new" RENAME TO "NotificationChannel";
DROP TYPE "public"."NotificationChannel_old";
COMMIT;

-- AlterTable
ALTER TABLE "HotelSettings" DROP COLUMN "notificationPhone",
DROP COLUMN "notifySms";

