/**
 * Test database connection
 * Run with: npx tsx scripts/test-connection.ts
 */

import { PrismaClient } from '@prisma/client';

async function testConnection() {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('❌ DATABASE_URL not found in environment variables');
    console.log('💡 Make sure you have a .env file in the backend directory with DATABASE_URL set');
    process.exit(1);
  }

  // Mask password in URL for display
  const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`🔍 Testing connection to: ${maskedUrl}`);

  const prisma = new PrismaClient({
    log: ['error', 'warn'],
  });

  try {
    // Try to connect
    await prisma.$connect();
    console.log('✅ Successfully connected to database!');

    // Try a simple query
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database query successful!');

    // Try to get database name
    const result = await prisma.$queryRaw<Array<{ current_database: string }>>`
      SELECT current_database();
    `;
    console.log(`✅ Current database: ${result[0]?.current_database || 'unknown'}`);

  } catch (error: any) {
    console.error('❌ Connection failed:', error.message);
    
    if (error.message.includes('denied access')) {
      console.log('\n💡 Possible issues:');
      console.log('   1. Database user doesn\'t have permission');
      console.log('   2. Wrong username/password in DATABASE_URL');
      console.log('   3. Database doesn\'t exist');
      console.log('\n📝 Check your DATABASE_URL format:');
      console.log('   postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE');
      console.log('   Example: postgresql://postgres:mypassword@localhost:5432/marketlabs');
    } else if (error.message.includes('does not exist')) {
      console.log('\n💡 Database does not exist. Create it first using:');
      console.log('   - A PostgreSQL GUI tool (pgAdmin, TablePlus, DBeaver)');
      console.log('   - Or connect as superuser and run: CREATE DATABASE marketlabs;');
    } else if (error.message.includes('connection')) {
      console.log('\n💡 Connection issue. Check:');
      console.log('   1. PostgreSQL server is running');
      console.log('   2. Host and port are correct');
      console.log('   3. Firewall allows the connection');
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

