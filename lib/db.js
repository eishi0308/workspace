import { DataAPIClient } from "@datastax/astra-db-ts";

import { astraDb } from "./config.js";

const client = new DataAPIClient(astraDb.token);
const db = client.db(astraDb.endpoint);
export const collection = db.collection(astraDb.collection);
