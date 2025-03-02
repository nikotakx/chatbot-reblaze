import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for WebSockets - required for serverless environments
// This may cause issues in some Docker environments - see error handling below
try {
  neonConfig.webSocketConstructor = ws;
  console.log("Configured Neon with WebSocket support");
} catch (err) {
  console.warn("Failed to configure Neon WebSocket:", err);
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Validate DATABASE_URL format to catch potential configuration errors
const dbUrl = process.env.DATABASE_URL;
if (dbUrl.startsWith('wss://') && !dbUrl.includes('neon.tech')) {
  console.error("ERROR: Invalid database URL format. Using WebSocket URL for non-Neon database.");
  console.error("For standard PostgreSQL in Docker, use format: postgres://user:password@host:port/database");
  throw new Error("Invalid DATABASE_URL format. See logs for details.");
}

// Log connection info without credentials
console.log(`Connecting to database: ${dbUrl.substring(0, dbUrl.indexOf('://')+3)}[credentials-hidden]`);

// Create connection pool with improved configuration
const poolConfig = { 
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
};

// Initialize pool and Drizzle ORM
export const pool = new Pool(poolConfig);

// Add error handler
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

// Initialize Drizzle ORM with the pool
export const db = drizzle({ client: pool, schema });

console.log("Database connection established");
