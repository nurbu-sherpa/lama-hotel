-- Data migration: create one physical room (RoomUnit) per room in each existing room type,
-- so inventory = individual rooms from day one (e.g. 6 × "Standard N", 2 × "Special N").
-- Only runs for room types that have no physical rooms yet, so it is safe on any database.
INSERT INTO "RoomUnit" ("id", "roomId", "name", "code", "active", "sortOrder", "notes", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  r."id",
  regexp_replace(r."name", '\s+Room$', '') || ' ' || n,
  (CASE r."slug"
     WHEN 'standard-room' THEN 'STD'
     WHEN 'special-room' THEN 'SPC'
     ELSE upper(left(regexp_replace(r."slug", '[^a-z]', '', 'g'), 3)) || '-' || left(r."id"::text, 4)
   END) || '-' || n,
  true,
  n,
  '',
  NOW(),
  NOW()
FROM "Room" r
CROSS JOIN LATERAL generate_series(1, r."totalRooms") AS n
WHERE NOT EXISTS (SELECT 1 FROM "RoomUnit" u WHERE u."roomId" = r."id");
