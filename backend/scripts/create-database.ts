/**
 * Script to create the marketlabs database
 * Run with: npm run db:create  or  npx tsx scripts/create-database.ts
 */
import 'dotenv/config';

import { PrismaClient } from '@prisma/client';

async function createDatabase() {
  // Connect to the default postgres database to create our database
  const defaultDbUrl = process.env.DATABASE_URL?.replace(/\/[^/]+$/, '/postgres') || 'postgresql://postgres@localhost:5432/postgres';
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: defaultDbUrl,
      },
    },
  });

  try {
    // Try to create the database
    await prisma.$executeRawUnsafe(`CREATE DATABASE marketlabs;`);
    console.log('✅ Database "marketlabs" created successfully');
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('ℹ️  Database "marketlabs" already exists');
    } else {
      console.error('❌ Error creating database:', error.message);
      console.log('\n💡 Alternative: Create the database manually using:');
      console.log('   - pgAdmin or another PostgreSQL GUI tool');
      console.log('   - Docker: docker exec -it postgres psql -U postgres -c "CREATE DATABASE marketlabs;"');
      console.log('   - Or connect to your PostgreSQL instance and run: CREATE DATABASE marketlabs;');
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createDatabase();

