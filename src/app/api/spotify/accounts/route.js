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

    // Query the standard NextAuth Account model for Spotify accounts
    const spotifyAccounts = await prisma.account.findMany({
      where: {
        userId: session.user.id,
        provider: 'spotify'
      },
      // Join with User to get additional profile info if needed
      include: {
        user: true
      }
    });

    // Transform the data to match your frontend expectations
    const formattedAccounts = spotifyAccounts.map(account => ({
      id: account.id,
      userId: account.userId,
      spotifyId: account.providerAccountId,
      displayName: account.user.name || 'Spotify User',
      email: account.user.email,
      // You might need to store image URL in the user profile or session
      accessToken: account.access_token,
      refreshToken: account.refresh_token,
      expiresAt: new Date(account.expires_at * 1000)
    }));

    return new Response(JSON.stringify(formattedAccounts), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching Spotify accounts:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch Spotify accounts' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    await prisma.$disconnect();
  }
} 