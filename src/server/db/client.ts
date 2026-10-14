import type { D1Database as CloudflareD1Database } from "@cloudflare/workers-types";
import { drizzle } from "drizzle-orm/d1";
import type { D1Database } from "../api";
import * as schema from "./schema";

// Production receives a Cloudflare D1 binding. Keep the narrower existing API
// contract so unit-test doubles can continue to implement only the used methods.
export function createDatabase(binding: D1Database | CloudflareD1Database) {
  return drizzle(binding as CloudflareD1Database, { schema });
}
