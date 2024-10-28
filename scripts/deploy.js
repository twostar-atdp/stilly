const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const dbPath = '/tmp/stilly.db';

try {
  // Create fresh database
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  // Set DATABASE_URL for prisma commands
  process.env.DATABASE_URL = `file:${dbPath}`;

  console.log('Running prisma generate...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  console.log('Running prisma db push...');
  execSync('npx prisma db push', { stdio: 'inherit' });
  
  console.log('Running database seed...');
  try {
    execSync('npx prisma db seed', { stdio: 'inherit' });
  } catch (error) {
    console.error('Warning: Seeding failed, but continuing build:', error.message);
  }

  console.log('Database setup complete');
  
  // Continue with Next.js build
  console.log('Starting Next.js build...');
  execSync('next build', { stdio: 'inherit' });
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}