/**
 * Baseline migration - mark existing database state as baseline
 * This allows us to add only MarketLabs tables without affecting existing supermolt tables
 * Run with: npx tsx scripts/baseline-migration.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

async function baselineMigration() {
  console.log('📋 Setting up baseline migration for MarketLabs...\n');

  // Create migrations directory if it doesn't exist
  const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  // Create a baseline migration that does nothing (empty migration)
  const baselineDir = path.join(migrationsDir, '0_baseline');
  if (!fs.existsSync(baselineDir)) {
    fs.mkdirSync(baselineDir, { recursive: true });
    
    // Create empty migration.sql
    const migrationSql = `-- This is a baseline migration.
-- The database already contains tables from supermolt-mono.
-- MarketLabs tables will be added in subsequent migrations.
`;
    
    fs.writeFileSync(path.join(baselineDir, 'migration.sql'), migrationSql);
    console.log('✅ Created baseline migration directory');
  } else {
    console.log('ℹ️  Baseline migration already exists');
  }

  // Mark it as applied in the database
  const prisma = new PrismaClient();
  try {
    // Check if _prisma_migrations table exists
    await prisma.$queryRaw`
      SELECT 1 FROM _prisma_migrations LIMIT 1
    `.catch(() => {
      // Table doesn't exist, that's okay
    });

    // Insert baseline migration record
    await prisma.$executeRawUnsafe(`
      INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
      VALUES ('0_baseline', '', NOW(), '0_baseline', NULL, NULL, NOW(), 1)
      ON CONFLICT (migration_name) DO NOTHING;
    `);
    
    console.log('✅ Baseline migration marked as applied');
    console.log('\n✅ You can now run: npx prisma migrate dev --name add_marketlabs_tables');
  } catch (error: any) {
    console.log('ℹ️  Note: Migration table might not exist yet. This is okay.');
    console.log('   Run: npx prisma migrate dev --name init');
    console.log('   Prisma will create the migration table and baseline.');
  } finally {
    await prisma.$disconnect();
  }
}

baselineMigration();

