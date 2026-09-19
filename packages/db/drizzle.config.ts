import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
config({ path: "../web-app/.env.local", quiet: true });
export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
