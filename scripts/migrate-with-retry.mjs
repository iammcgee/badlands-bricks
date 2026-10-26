import { execSync } from "node:child_process";

const attempts = 5;
const delaySeconds = 15;

function migrateDatabaseUrl() {
  const explicit =
    process.env.DIRECT_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING;
  if (explicit) return explicit;

  const raw = process.env.DATABASE_URL;
  if (!raw) return raw;

  try {
    const url = new URL(raw);
    // Neon pooled hosts look like ep-xxx-pooler.region.aws.neon.tech
    if (url.hostname.includes("-pooler.")) {
      url.hostname = url.hostname.replace("-pooler.", ".");
    }
    url.searchParams.delete("pgbouncer");
    return url.toString();
  } catch {
    return raw;
  }
}

const databaseUrl = migrateDatabaseUrl();
if (!databaseUrl) {
  console.error("DATABASE_URL is not set; cannot run prisma migrate deploy.");
  process.exit(1);
}

const env = { ...process.env, DATABASE_URL: databaseUrl };
if (!process.env.DIRECT_URL) {
  env.DIRECT_URL = databaseUrl;
}

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  try {
    console.log(
      `Running prisma migrate deploy (attempt ${attempt}/${attempts})...`,
    );
    execSync("npx prisma migrate deploy", { stdio: "inherit", env });
    process.exit(0);
  } catch (error) {
    if (attempt === attempts) {
      console.error("prisma migrate deploy failed after retries.");
      process.exit(1);
    }
    console.warn(
      `Migrate attempt ${attempt} failed. Waiting ${delaySeconds}s before retry...`,
    );
    execSync(`sleep ${delaySeconds}`, { stdio: "inherit" });
  }
}
