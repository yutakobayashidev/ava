import { exec } from "node:child_process";
import { promisify } from "node:util";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { DockerComposeEnvironment, Wait } from "testcontainers";
import type { PgDatabase } from "@/clients/drizzle";
import * as schema from "@/db/schema";
import { createDBUrl } from "@/utils/db";

const execAsync = promisify(exec);

export async function setupDB({ port }: { port: "random" | number }) {
  const container = await new DockerComposeEnvironment(".", "compose.yml")
    .withEnvironmentFile(".env.test")
    // compose.ymlは上書き可能な設定になっている
    .withEnvironment({
      DATABASE_PORT: port === "random" ? "0" : `${port}`,
    })
    .withWaitStrategy("db", Wait.forListeningPorts())
    .up(["db"]);

  const dbContainer = container.getContainer("db-1");

  // host側にbindされたランダムなポートを得る
  const mappedPort = dbContainer.getMappedPort(5432);

  const url = createDBUrl({
    host: dbContainer.getHost(),
    port: mappedPort,
  });

  await execAsync(`DATABASE_URL=${url} npx drizzle-kit push`);

  const pool = postgres(url, { max: 1 });
  const db = drizzle(pool, { schema });

  async function down() {
    await pool.end();
    await container.down();
  }

  return {
    url,
    container,
    port: mappedPort,
    db,
    truncate: () => truncate(db),
    down,
    async [Symbol.asyncDispose]() {
      await down();
    },
  } as const;
}

export async function truncate(db: PgDatabase) {
  const query = sql<string>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE';
    `;

  const tables = await db.execute(query);

  for (const table of tables) {
    const tableName = table.table_name;
    const query = sql.raw(
      `TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`,
    );
    await db.execute(query);
  }
}
