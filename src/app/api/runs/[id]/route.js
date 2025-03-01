import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const id = await params.id;
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'Run ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const run = await prisma.run.findUnique({
      where: {
        id: id,
      },
    });
    
    if (!run) {
      return new Response(JSON.stringify({ error: 'Run not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Check if the run belongs to the current user
    if (run.userId !== session.user.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify(run), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error fetching run:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch run' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const id = await params.id;
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'Run ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Check if the run exists and belongs to the user
    const existingRun = await prisma.run.findUnique({
      where: {
        id: id,
      },
    });
    
    if (!existingRun) {
      return new Response(JSON.stringify({ error: 'Run not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    if (existingRun.userId !== session.user.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Parse the request body
    const data = await req.json();
    console.log('Received update data:', data);
    
    const { name, date, distance, distanceUnit, pace, estimatedDuration } = data;
    
    // Validate required fields
    if (!name || !date || !distance || !distanceUnit || !pace) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields',
        received: { name, date, distance, distanceUnit, pace, estimatedDuration }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Update the run
    const updatedRun = await prisma.run.update({
      where: {
        id: id,
      },
      data: {
        name,
        date: new Date(date),
        distance: parseFloat(distance),
        distanceUnit,
        pace,
        estimatedDuration,
      },
    });
    
    console.log('Updated run:', updatedRun);
    
    return new Response(JSON.stringify(updatedRun), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error updating run:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to update run', 
      details: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 