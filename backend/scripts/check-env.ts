/**
 * Check and validate .env file
 * Run with: npx tsx scripts/check-env.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(process.cwd(), '.env');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found in backend directory');
  console.log('\n💡 Create a .env file with the following content:');
  console.log(`
PORT=3002
NODE_ENV=development
PRIVY_APP_ID=dev-privy-app-id
PRIVY_APP_SECRET=dev-privy-app-secret
JWT_SECRET=your_jwt_secret_minimum_32_characters_long_please_change_this
DATABASE_URL=postgresql://postgres@localhost:5432/marketlabs
DERIV_APP_ID=1089
DERIV_WS_URL=wss://ws.binaryws.com/websockets/v3
  `);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const lines = envContent.split('\n');

console.log('📋 Checking .env file...\n');

let hasDatabaseUrl = false;
let databaseUrlLine = '';

for (const line of lines) {
  if (line.startsWith('DATABASE_URL=')) {
    hasDatabaseUrl = true;
    databaseUrlLine = line;
    break;
  }
}

if (!hasDatabaseUrl) {
  console.error('❌ DATABASE_URL not found in .env file');
  console.log('\n💡 Add this line to your .env file:');
  console.log('   DATABASE_URL=postgresql://postgres@localhost:5432/marketlabs');
  process.exit(1);
}

const dbUrl = databaseUrlLine.replace('DATABASE_URL=', '').trim();

// Parse the URL
const urlMatch = dbUrl.match(/^postgresql:\/\/([^:]+)(?::([^@]+))?@([^:]+):(\d+)\/(.+)$/);

if (!urlMatch) {
  console.error('❌ Invalid DATABASE_URL format');
  console.log('\n📝 Current value:', dbUrl);
  console.log('\n💡 Correct format:');
  console.log('   postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE');
  console.log('\n   Examples:');
  console.log('   - With password: postgresql://postgres:mypassword@localhost:5432/marketlabs');
  console.log('   - Without password: postgresql://postgres@localhost:5432/marketlabs');
  process.exit(1);
}

const [, username, password, host, port, database] = urlMatch;

console.log('✅ DATABASE_URL found and format is valid');
console.log('\n📊 Connection details:');
console.log(`   Username: ${username || '(not set)'}`);
console.log(`   Password: ${password ? '****' : '(not set)'}`);
console.log(`   Host: ${host}`);
console.log(`   Port: ${port}`);
console.log(`   Database: ${database}`);

if (!username) {
  console.error('\n❌ Username is missing!');
  console.log('\n💡 Fix your DATABASE_URL to include a username:');
  console.log('   DATABASE_URL=postgresql://postgres@localhost:5432/marketlabs');
  console.log('   (Replace "postgres" with your PostgreSQL username)');
  process.exit(1);
}

if (!password && database !== 'postgres') {
  console.log('\n⚠️  No password set - this might be okay if PostgreSQL is configured for trust authentication');
}

console.log('\n✅ .env file looks good!');
console.log('   Run "npm run db:test" to test the connection');

