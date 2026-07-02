import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://smartshop:smartshop@localhost:5432/smartshop",
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });