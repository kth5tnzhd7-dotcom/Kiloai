import { createDatabase } from "@kilocode/app-builder-db";
import * as schema from "./schema";

if (!process.env.DB_URL) {
  process.env.DB_URL = "file:./data.db";
}
if (!process.env.DB_TOKEN) {
  process.env.DB_TOKEN = "local-dev-token";
}

export const db = createDatabase(schema);
