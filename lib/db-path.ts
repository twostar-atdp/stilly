export function getDatabasePath() {
    // Use /tmp in production (Vercel), local path in development
    if (process.env.NODE_ENV === 'production') {
      return 'file:/tmp/stilly.db';
    }
    return 'file:./prisma/dev.db';
  }