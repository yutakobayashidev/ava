import { db } from "@ava/database/client";
import { users } from "@ava/database/schema";

async function main() {
  console.log("Hello World from batch-jobs!");
  console.log("Connecting to database...");

  try {
    // Simple query to test connection
    const userCount = await db.select().from(users).limit(1);
    console.log(
      `Database connection successful. Found ${userCount.length} user(s).`,
    );
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
