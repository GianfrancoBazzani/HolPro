import { createPool, type Pool } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema";
const globalDb = globalThis as typeof globalThis & { holproPool?: Pool };
const pool =
  globalDb.holproPool ??
  createPool({
    uri: process.env.DATABASE_URL,
    timezone: "Z",
    connectionLimit: 5,
    charset: "utf8mb4",
  });
if (process.env.NODE_ENV !== "production") globalDb.holproPool = pool;
export const db = drizzle(pool, { schema, mode: "default" });
