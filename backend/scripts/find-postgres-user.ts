/**
 * Try to find the correct PostgreSQL username
 * Run with: npx tsx scripts/find-postgres-user.ts
 */

import { PrismaClient } from '@prisma/client';
import * as os from 'os';

const usernamesToTry = [
  'postgres',
  os.userInfo().username, // macOS username
  'admin',
  'root',
];

const databasesToTry = ['supermolt', 'postgres', 'template1'];

async function testConnection(username: string, database: string) {
  const dbUrl = `postgresql://${username}@localhost:5432/${database}`;
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log: [],
  });

  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();
    return true;
  } catch {
    await prisma.$disconnect().catch(() => {});
    return false;
  }
}

async function findWorkingConnection() {
  console.log('🔍 Testing PostgreSQL connections...\n');
  console.log(`   Your macOS username: ${os.userInfo().username}\n`);

  for (const username of usernamesToTry) {
    for (const database of databasesToTry) {
      process.stdout.write(`   Testing ${username}@${database}... `);
      const works = await testConnection(username, database);
      if (works) {
        console.log('✅ WORKS!');
        console.log(`\n✅ Found working connection!\n`);
        console.log(`📝 Update your .env file with:`);
        console.log(`   DATABASE_URL=postgresql://${username}@localhost:5432/${database}`);
        if (database !== 'supermolt' && database !== 'marketlabs') {
          console.log(`\n💡 Note: You're connecting to "${database}" database.`);
          console.log(`   You can create a new database or use this one.`);
        }
        return { username, database };
      } else {
        console.log('❌');
      }
    }
  }

  console.log('\n❌ Could not find a working connection.\n');
  console.log('💡 Options:');
  console.log('   1. Use a managed PostgreSQL service (recommended):');
  console.log('      - Supabase: https://supabase.com (free tier)');
  console.log('      - Neon: https://neon.tech (free tier)');
  console.log('      - Railway: https://railway.app (free tier)');
  console.log('\n   2. Check your PostgreSQL installation:');
  console.log('      - Is PostgreSQL running?');
  console.log('      - What port is it on? (default: 5432)');
  console.log('      - Try: brew services list (if installed via Homebrew)');
  console.log('\n   3. Use a PostgreSQL GUI tool to check:');
  console.log('      - TablePlus, pgAdmin, or DBeaver');
  console.log('      - Connect and check what username/database works');

  return null;
}

findWorkingConnection().then((result) => {
  if (result) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

