import { Pool } from "pg";

// import { PrismaClient } from "@prisma/client";
// const prisma = new PrismaClient();
// export default prisma;

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default db;
