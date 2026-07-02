import { defineConfig } from "prisma/config";
import "dotenv/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed/index.ts",
  },

  datasource: {
    url: process.env.DATABASE_URL!,
  },
});