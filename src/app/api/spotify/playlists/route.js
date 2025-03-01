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

    // Check if token is expired and refresh if needed
    const now = Math.floor(Date.now() / 1000);
    if (spotifyAccount.expires_at < now) {
      // Token is expired, refresh it
      const refreshResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: spotifyAccount.refresh_token
        })
      });
      
      if (!refreshResponse.ok) {
        return new Response(JSON.stringify({ error: 'Failed to refresh token' }), {
          status: refreshResponse.status,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      const refreshData = await refreshResponse.json();
      
      // Update the account with the new token
      await prisma.account.update({
        where: {
          id: spotifyAccount.id
        },
        data: {
          access_token: refreshData.access_token,
          expires_at: now + refreshData.expires_in
        }
      });
      
      // Update the access token for the current request
      spotifyAccount.access_token = refreshData.access_token;
    }

    // Fetch playlists with the valid token
    const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: {
        'Authorization': `Bearer ${spotifyAccount.access_token}`
      }
    });

    if (!response.ok) {
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