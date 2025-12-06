import { exec } from "node:child_process";
import { promisify } from "node:util";

import { drizzle } from "drizzle-orm/postgres-js";
import { reset } from "drizzle-seed";
import postgres from "postgres";
import { DockerComposeEnvironment, Wait } from "testcontainers";
import type { PgDatabase } from "@ava/database/client";
import * as schema from "@ava/database/schema";
import { createDBUrl } from "@ava/database/utils";

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

  await execAsync(
    `DATABASE_URL=${url} pnpm --filter @ava/database drizzle-kit push`,
  );

  const pool = postgres(url, { prepare: false });
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

async function truncate(db: PgDatabase) {
  await reset(db, schema);
}
