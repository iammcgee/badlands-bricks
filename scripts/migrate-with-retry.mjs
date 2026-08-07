import { execSync } from "node:child_process";

const attempts = 5;
const delaySeconds = 15;

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  try {
    console.log(`Running prisma migrate deploy (attempt ${attempt}/${attempts})...`);
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
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
