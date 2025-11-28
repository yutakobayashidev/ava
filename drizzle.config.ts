import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

loadEnvConfig(process.cwd());

export default defineConfig({
    schema: "./src/db/schema.ts",
    out: "./migrations",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL as string,
    },
});