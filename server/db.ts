import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for WebSockets - only if we're using a Neon database
// This may cause issues in some Docker environments - see error handling below
const isNeonDatabase = process.env.DATABASE_URL?.includes('neon.tech');

if (isNeonDatabase) {
  try {
    // Set WebSocket constructor for Neon
    neonConfig.webSocketConstructor = ws;
    
    // Add any additional Neon configuration
    // Use optional chaining to avoid type errors
    const config = neonConfig as any;
    if (config) {
      // Set connection caching if available
      if ('fetchConnectionCache' in config) {
        config.fetchConnectionCache = true;
      }
    }

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
  max: isNeonDatabase ? 5 : 10, // Reduce max connections for Neon
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: isNeonDatabase ? 10000 : 5000, // Increase timeout for Neon
  // Add additional options to improve Neon WebSocket stability
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
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