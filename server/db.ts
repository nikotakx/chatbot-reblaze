import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for WebSockets - only if we're using a Neon database
const isNeonDatabase = process.env.DATABASE_URL?.includes('neon.tech');

// Enhanced Neon WebSocket configuration with better error handling for Docker environments
if (isNeonDatabase) {
  try {
    // Set WebSocket constructor for Neon - critical for serverless environments
    neonConfig.webSocketConstructor = ws;
    
    // Set WebSocket implementation options (may help in Docker environments)
    if ('useSecureWebSocket' in neonConfig) {
      (neonConfig as any).useSecureWebSocket = true; // Force secure connections
    }
    
    // Adjust WebSocket connection parameters using type casting to avoid LSP errors
    // These properties may not be in TypeScript definitions but are supported by the library
    const extendedConfig = neonConfig as any;
    if (extendedConfig) {
      extendedConfig.wsConnectionTimeout = 20000; // 20 seconds timeout for Docker networking
      extendedConfig.retryTimeout = 1000; // Retry delay in milliseconds
      extendedConfig.maxRetries = 5; // Number of retry attempts
    }
    
    // Set connection caching if available
    const config = neonConfig as any;
    if (config && 'fetchConnectionCache' in config) {
      config.fetchConnectionCache = true;
    }

    console.log("Configured Neon with enhanced WebSocket support for containerized environments");
  } catch (err) {
    console.warn("Failed to configure Neon WebSocket:", err);
    
    // Fall back to basic configuration if enhanced fails
    try {
      neonConfig.webSocketConstructor = ws;
      console.log("Fallback to basic Neon WebSocket configuration");
    } catch (fallbackErr) {
      console.error("Critical Neon WebSocket configuration failure:", fallbackErr);
    }
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create connection pool with improved configuration for better Docker compatibility
const poolConfig = { 
  connectionString: process.env.DATABASE_URL,
  max: isNeonDatabase ? 3 : 10, // Further reduce max connections for Neon in Docker
  idleTimeoutMillis: 60000, // Longer idle timeout for Docker networking
  connectionTimeoutMillis: isNeonDatabase ? 15000 : 5000, // Increased timeout for Neon in Docker
  
  // Add additional options to improve Neon WebSocket stability in Docker
  keepAlive: true, 
  keepAliveInitialDelayMillis: 10000,
  
  // Add retry logic - essential for Docker environments where network can be unstable
  // during container startup or network congestion
  allowExitOnIdle: false, // Prevent pool shutdown on idle
  
  // Special Neon handling to deal with transient WebSocket connection issues in Docker
  ...(isNeonDatabase ? {
    ssl: {
      rejectUnauthorized: false, // More permissive SSL for some Docker environments
    },
    statement_timeout: 30000, // Increase statement timeout for Neon operations
    query_timeout: 30000, // Increase query timeout
  } : {})
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