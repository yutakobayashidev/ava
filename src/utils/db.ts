import "server-only";

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
  const baseUrl = `postgresql://${user}:${password}@${host}:${port}/${db}`;
  // productionとpreviewでは?pgbouncer=trueを付与
  if (
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "preview"
  ) {
    return `${baseUrl}?pgbouncer=true`;
  }
  return baseUrl;
}
