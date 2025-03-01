import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

export async function GET(req) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Redirect to the Spotify OAuth flow
  // The NextAuth callback will handle creating the account
  return Response.redirect(`/api/auth/signin/spotify?callbackUrl=/dashboard`);
} 