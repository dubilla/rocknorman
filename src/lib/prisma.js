import { PrismaClient } from '@prisma/client';

// Add debugging
console.log('Initializing Prisma client');

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global;

// Check if we already have a client instance
const existingClient = globalForPrisma.prisma;
console.log('Existing Prisma client:', !!existingClient);

// Create a new client if needed
export const prisma = existingClient || new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Log available models
if (prisma) {
  console.log('Available Prisma models:', Object.keys(prisma));
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma; 