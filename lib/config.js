import { env } from "node:process";

export const geminiApiKey = env.GEMINI_API_KEY || "";
export const astraDb = {
  endpoint: env.ASTRA_DB_ENDPOINT || "",
  token: env.ASTRA_DB_TOKEN || "",
  keyspace: env.ASTRA_DB_KEYSPACE || "default_keyspace",
  collection: env.ASTRA_DB_COLLECTION || "",
};
export const sessionSecret = env.SESSION_SECRET;
export const port = env.PORT || "3000";
