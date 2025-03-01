import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

// Create a direct instance for this request
const directPrisma = new PrismaClient();

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const data = await req.json();
    console.log('Received run data:', data);
    
    // Check if Run model exists
    console.log('Direct Prisma models:', Object.keys(directPrisma));
    console.log('Run model exists in direct client:', !!directPrisma.run);
    
    const { name, date, distance, distanceUnit, pace, playlistId, estimatedDuration } = data;
    
    // Validate required fields
    if (!name || !date || !distance || !distanceUnit || !pace || !playlistId) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields',
        received: { name, date, distance, distanceUnit, pace, playlistId, estimatedDuration }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Try using the direct client
    const run = await directPrisma.run.create({
      data: {
        name,
        date: new Date(date),
        distance: parseFloat(distance),
        distanceUnit,
        pace,
        estimatedDuration,
        userId: session.user.id,
        playlistId,
      },
    });
    
    console.log('Created run:', run);
    
    return new Response(JSON.stringify(run), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error creating run:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create run', 
      details: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    await directPrisma.$disconnect();
  }
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const runs = await prisma.run.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        date: 'desc',
      },
    });
    
    return new Response(JSON.stringify(runs), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error fetching runs:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch runs' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 