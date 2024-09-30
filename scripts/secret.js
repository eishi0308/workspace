import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import crypto from "node:crypto";

const envPath = join(import.meta.dirname, "..", ".env");
try {
  const env = await readFile(envPath, "utf8");
  const newSecret = crypto.randomBytes(32).toString("hex");
  let newEnv = "";
  if (env.includes("SESSION_SECRET=")) {
    newEnv = env.replace(
      /^SESSION_SECRET=.*$/m,
      `SESSION_SECRET="${newSecret}"`
    );
  } else {
    newEnv = `${env}\nSESSION_SECRET="${newSecret}"`;
  }
  await writeFile(envPath, newEnv);
} catch (error) {
  console.error("Could not read .env file. Make sure you have created one.");
}
