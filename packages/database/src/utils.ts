export function createDBUrl({
  user = process.env.DATABASE_USER,
  password = process.env.DATABASE_PASSWORD,
  host = process.env.DATABASE_HOST,
  port = Number(process.env.DATABASE_PORT),
  db = process.env.DATABASE_DB,
}: {
  user?: string;
  password?: string;
  host?: string;
  port?: number;
  db?: string;
}) {
  return `postgresql://${user}:${password}@${host}:${port}/${db}`;
}
