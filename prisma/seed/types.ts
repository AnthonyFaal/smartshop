import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Ensure DATABASE_URL is available when running this seed via `tsx`.
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Ensure you have a valid .env file loaded (dotenv/config) with DATABASE_URL."
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

