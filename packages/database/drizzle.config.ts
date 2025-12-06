import { config } from "dotenv-flow";
import { defineConfig } from "drizzle-kit";

// Load environment variables from parent directory (apps/www)
config({ path: "../../apps/www" });

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
});
