import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const attempts = 5;
const delaySeconds = 15;
const onVercel = Boolean(process.env.VERCEL);
const commentsSqlPath = "scripts/ensure-product-comments.sql";

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
    if (url.hostname.includes("-pooler.")) {
      url.hostname = url.hostname.replace("-pooler.", ".");
    }
    url.searchParams.delete("pgbouncer");
    return url.toString();
  } catch {
    return raw;
  }
}

function run(command, extraEnv = {}) {
  execSync(command, {
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
}

function migrateEnv() {
  const databaseUrl = migrateDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set; cannot run prisma migrate deploy.");
  }
  return {
    DATABASE_URL: databaseUrl,
    DIRECT_URL: process.env.DIRECT_URL || databaseUrl,
  };
}

function tryMigrateDeploy() {
  const extraEnv = migrateEnv();
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      console.log(
        `Running prisma migrate deploy (attempt ${attempt}/${attempts})...`,
      );
      run("npx prisma migrate deploy", extraEnv);
      return true;
    } catch (error) {
      if (attempt === attempts) {
        console.error("prisma migrate deploy failed after retries.");
        return false;
      }
      console.warn(
        `Migrate attempt ${attempt} failed. Waiting ${delaySeconds}s before retry...`,
      );
      execSync(`sleep ${delaySeconds}`, { stdio: "inherit" });
    }
  }
  return false;
}

function applyCommentsSqlFallback() {
  const extraEnv = migrateEnv();
  const sql = readFileSync(commentsSqlPath, "utf8");
  if (!sql.trim()) {
    throw new Error(`Missing ${commentsSqlPath}`);
  }
  console.log("Applying comments table SQL fallback...");
  run(`npx prisma db execute --file ${commentsSqlPath}`, extraEnv);
}

function trySeed() {
  try {
    console.log("Seeding database...");
    run("npx tsx prisma/seed.ts");
    return true;
  } catch (error) {
    console.error("Seed failed.");
    return false;
  }
}

const migrated = tryMigrateDeploy();
if (!migrated) {
  try {
    applyCommentsSqlFallback();
  } catch (error) {
    console.error("Comments SQL fallback failed:", error);
    if (!onVercel) process.exit(1);
  }
}

const seeded = trySeed();
if (!seeded && !onVercel) {
  process.exit(1);
}

if (!migrated && !onVercel) {
  process.exit(1);
}
