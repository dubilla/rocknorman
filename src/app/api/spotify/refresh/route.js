import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req) {
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
    
    // Refresh the token
    const response = await fetch('https://accounts.spotify.com/api/token', {
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
    
    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Failed to refresh token' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const data = await response.json();
    
    // Update the account with the new token
    await prisma.account.update({
      where: {
        id: spotifyAccount.id
      },
      data: {
        access_token: data.access_token,
        expires_at: Math.floor(Date.now() / 1000) + data.expires_in
      }
    });
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error refreshing token:', error);
    return new Response(JSON.stringify({ error: 'Failed to refresh token' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    await prisma.$disconnect();
  }
} 