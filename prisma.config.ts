import "dotenv/config";
import { defineConfig } from "prisma/config";

// Replaces the old `prisma` key in package.json (removed in Prisma 7).
// With a config file, Prisma no longer reads .env by itself — hence dotenv above.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { seed: "tsx prisma/seed.ts" },
});
