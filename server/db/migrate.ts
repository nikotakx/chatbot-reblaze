import "dotenv/config";
import { db } from "./index";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { documentationFiles, documentationImages, documentationChunks, repositoryConfig, chatMessages } from "./schema";
import { storage } from "../storage";

async function main() {
  console.log("Starting database migration...");
  
  // Run migrations
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("Migration complete!");
  
  // Seed data if needed
  await seedDatabase();
  console.log("Database seeding complete!");
}

async function seedDatabase() {
  // Check if we already have data
  console.log("Checking for existing repository config...");
  const existingConfig = await storage.getRepositoryConfig();
  if (existingConfig) {
    console.log("Database already has data, skipping seeding.");
    return;
  }
  
  console.log("Seeding database with initial data...");
  
  // Add repository config
  const config = await storage.createRepositoryConfig({
    url: "https://github.com/acme/product-docs",
    branch: "main",
    isActive: true
  });
  console.log("Created repository config:", config);
  
  // Add sample documentation files
  const file1 = await storage.createDocumentationFile({
    path: "getting-started.md",
    content: `# Getting Started
    
  Welcome to our product! This guide will help you get up and running quickly.
  
  ## Installation
  
  Install our product using npm:
  
  \`\`\`
  npm install @product/core
  \`\`\`
  
  ## Basic Usage
  
  Import the package in your code:
  
  \`\`\`javascript
  import { Product } from '@product/core';
  
  const product = new Product();
  product.init();
  \`\`\`
  
  ## System Requirements
  
  - Operating System: Windows 10/11, macOS 10.15+, or Ubuntu 20.04+
  - RAM: Minimum 4GB, 8GB recommended
  - Disk Space: At least 2GB free space
  - Processor: 2GHz dual-core or better
  - Node.js: v14 or higher
  - Database: MongoDB 4.4+ or PostgreSQL 12+
  `,
    hasImages: false,
    githubUrl: "https://github.com/acme/product-docs/blob/main/getting-started.md"
  });
  console.log("Created file 1:", file1);
  
  const file2 = await storage.createDocumentationFile({
    path: "dashboard.md",
    content: `# Dashboard
  
  The dashboard provides an overview of your system's key metrics and performance indicators.
  
  ## Layout
  
  The dashboard is divided into customizable widgets that can be arranged according to your preferences.
  
  ![Dashboard interface showing various metrics](https://images.unsplash.com/photo-1551288049-bebda4e38f71)
  
  ## Available Widgets
  
  - **User Activity**: Shows active users over time
  - **Revenue**: Displays current revenue metrics
  - **System Health**: Monitors system performance
  - **Recent Events**: Lists latest system events
  
  ## Customization
  
  You can customize your dashboard by clicking the "Customize" button in the top-right corner.
  `,
    hasImages: true,
    githubUrl: "https://github.com/acme/product-docs/blob/main/dashboard.md"
  });
  console.log("Created file 2:", file2);
  
  const file3 = await storage.createDocumentationFile({
    path: "authentication.md",
    content: `# Authentication
  
  This guide explains how to set up and configure authentication for your application.
  
  ## Configuration
  
  Here's how you can configure the authentication settings in the application:
  
  1. Navigate to Settings > Authentication
  2. Choose the auth provider (OAuth, JWT, or Basic)
  3. Enter your credentials
  4. Click Save
  
  ![Authentication settings panel](https://images.unsplash.com/photo-1566837945700-30057527ade0)
  
  ## Authentication Providers
  
  We support multiple authentication providers:
  
  - **OAuth**: Connect with Google, GitHub, etc.
  - **JWT**: Use JSON Web Tokens
  - **Basic Auth**: Simple username/password authentication
  
  ## Security Best Practices
  
  Always use HTTPS and rotate your credentials regularly.
  `,
    hasImages: true,
    githubUrl: "https://github.com/acme/product-docs/blob/main/authentication.md"
  });
  console.log("Created file 3:", file3);
  
  // Add images
  const image1 = await storage.createDocumentationImage({
    fileId: file2.id,
    path: "dashboard.md",
    url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71",
    alt: "Dashboard interface showing various metrics"
  });
  console.log("Created image 1:", image1);
  
  const image2 = await storage.createDocumentationImage({
    fileId: file3.id,
    path: "authentication.md",
    url: "https://images.unsplash.com/photo-1566837945700-30057527ade0",
    alt: "Authentication settings panel"
  });
  console.log("Created image 2:", image2);
  
  // Add chunks (simplified for example)
  const chunk1 = await storage.createDocumentationChunk({
    fileId: file1.id,
    content: "Welcome to our product! This guide will help you get up and running quickly.",
    metadata: { path: "getting-started.md", section: "intro" },
    embedding: ""
  });
  console.log("Created chunk 1:", chunk1);
  
  const chunk2 = await storage.createDocumentationChunk({
    fileId: file1.id,
    content: "Install our product using npm: npm install @product/core",
    metadata: { path: "getting-started.md", section: "installation" },
    embedding: ""
  });
  console.log("Created chunk 2:", chunk2);
  
  const chunk3 = await storage.createDocumentationChunk({
    fileId: file1.id,
    content: `System Requirements:
  - Operating System: Windows 10/11, macOS 10.15+, or Ubuntu 20.04+
  - RAM: Minimum 4GB, 8GB recommended
  - Disk Space: At least 2GB free space
  - Processor: 2GHz dual-core or better
  - Node.js: v14 or higher
  - Database: MongoDB 4.4+ or PostgreSQL 12+`,
    metadata: { path: "getting-started.md", section: "requirements" },
    embedding: ""
  });
  console.log("Created chunk 3:", chunk3);
  
  const chunk4 = await storage.createDocumentationChunk({
    fileId: file2.id,
    content: "The dashboard provides an overview of your system's key metrics and performance indicators.",
    metadata: { path: "dashboard.md", section: "intro", hasImage: false },
    embedding: ""
  });
  console.log("Created chunk 4:", chunk4);
  
  const chunk5 = await storage.createDocumentationChunk({
    fileId: file2.id,
    content: "The dashboard is divided into customizable widgets that can be arranged according to your preferences.",
    metadata: { 
      path: "dashboard.md", 
      section: "layout", 
      hasImage: true,
      imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71",
      imageAlt: "Dashboard interface showing various metrics"
    },
    embedding: ""
  });
  console.log("Created chunk 5:", chunk5);
  
  const chunk6 = await storage.createDocumentationChunk({
    fileId: file3.id,
    content: `Here's how you can configure the authentication settings in the application:
  1. Navigate to Settings > Authentication
  2. Choose the auth provider (OAuth, JWT, or Basic)
  3. Enter your credentials
  4. Click Save`,
    metadata: { 
      path: "authentication.md", 
      section: "configuration", 
      hasImage: true,
      imageUrl: "https://images.unsplash.com/photo-1566837945700-30057527ade0",
      imageAlt: "Authentication settings panel"
    },
    embedding: ""
  });
  console.log("Created chunk 6:", chunk6);
}

main()
  .then(() => {
    console.log("Database setup complete!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error setting up database:", err);
    process.exit(1);
  });