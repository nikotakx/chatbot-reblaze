import * as fs from 'fs';
import * as path from 'path';
import { db } from './index';
import { eq } from 'drizzle-orm';
import { documentationFiles, documentationChunks, documentationImages, repositoryConfig, chatMessages } from '../db/schema';

// Simple migration system
async function main() {
  console.log('Running database migrations...');

  try {
    // Read and execute migrations
    const migrationsDir = path.join(process.cwd(), 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir).sort();

    for (const migrationFile of migrationFiles) {
      console.log(`Executing migration: ${migrationFile}`);
      const sql = fs.readFileSync(path.join(migrationsDir, migrationFile), 'utf8');
      
      // Execute the SQL query
      await db.execute(sql);
      console.log(`Migration ${migrationFile} applied successfully`);
    }

    // After migrations, seed some initial data if needed
    await seedDatabase();

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Seed initial data if needed
async function seedDatabase() {
  console.log('Checking if database needs seeding...');
  
  // Check if we have a repository config
  const repoConfig = await db.select().from(repositoryConfig).limit(1);
  
  if (repoConfig.length === 0) {
    console.log('No repository config found, seeding initial data...');
    
    // Create a sample repository config
    await db.insert(repositoryConfig).values({
      url: 'https://github.com/example/docs',
      branch: 'main',
      isActive: true
    });
    
    console.log('Database seeded with initial data');
  } else {
    console.log('Database already has data, skipping seed');
  }
}

// Execute migrations
main();