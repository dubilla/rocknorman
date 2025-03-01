import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the Spotify account for this user
    const spotifyAccount = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: 'spotify'
      }
    });

    if (!spotifyAccount) {
      return new Response(JSON.stringify({ error: 'No Spotify account connected' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch playlists from Spotify API
    const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: {
        'Authorization': `Bearer ${spotifyAccount.access_token}`
      }
    });

    if (!response.ok) {
      // Handle token expiration by refreshing
      if (response.status === 401) {
        // Token expired, we should implement token refresh here
        return new Response(JSON.stringify({ error: 'Spotify token expired' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'Failed to fetch playlists from Spotify' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching playlists:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch playlists' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    await prisma.$disconnect();
  }
} 