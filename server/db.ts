import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for WebSockets - only if we're using a Neon database
// This may cause issues in some Docker environments - see error handling below
const isNeonDatabase = process.env.DATABASE_URL?.includes('neon.tech');

if (isNeonDatabase) {
  try {
    neonConfig.webSocketConstructor = ws;
    console.log("Configured Neon with WebSocket support");
  } catch (err) {
    console.warn("Failed to configure Neon WebSocket:", err);
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

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
  process.exit(1); // Exit on critical database errors
});

// Initialize Drizzle ORM with the pool
export const db = drizzle({ client: pool, schema });

console.log(`Database connection established using ${isNeonDatabase ? 'Neon' : 'standard PostgreSQL'}`);