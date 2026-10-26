import "server-only";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

/**
 * Local development points at a file; production points at Turso.
 * The same libSQL driver is used in both places, so there is no dialect
 * difference between dev and prod.
 */
const url = process.env.DATABASE_URL ?? "file:./dev.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;

const globalForDb = globalThis as unknown as {
  client?: ReturnType<typeof createClient>;
};

// Reuse the connection across hot reloads in development.
const client = globalForDb.client ?? createClient({ url, authToken });
if (process.env.NODE_ENV !== "production") globalForDb.client = client;

export const db = drizzle(client, { schema });
export { client };
