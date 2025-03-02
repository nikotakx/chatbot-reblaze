import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Create the postgres connection
const connectionString = process.env.DATABASE_URL || "";
const client = postgres(connectionString);

// Create the database client
export const db = drizzle(client, { schema });