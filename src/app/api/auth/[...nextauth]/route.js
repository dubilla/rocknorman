import NextAuth from 'next-auth';
import SpotifyProvider from 'next-auth/providers/spotify';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Spotify scopes for API access
const scopes = [
  'user-read-email',
  'user-read-private',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-private',
  'playlist-modify-public',
].join(' ');

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      authorization: {
        params: { scope: scopes }
      }
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter an email and password');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) {
          throw new Error('No user found with this email');
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error('Invalid password');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      }
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id;
      }
      
      // Store Spotify tokens when a user connects their account
      if (account && account.provider === 'spotify') {
        try {
          // Get the current user from the session token
          const currentUser = await prisma.user.findUnique({
            where: { id: token.id }
          });
          
          if (currentUser) {
            // Check if this Spotify account is already connected
            const existingAccount = await prisma.spotifyAccount.findUnique({
              where: { spotifyId: profile.id }
            });
            
            if (!existingAccount) {
              // Create a new SpotifyAccount record
              await prisma.spotifyAccount.create({
                data: {
                  userId: currentUser.id,
                  spotifyId: profile.id,
                  displayName: profile.display_name,
                  email: profile.email,
                  imageUrl: profile.images?.[0]?.url,
                  accessToken: account.access_token,
                  refreshToken: account.refresh_token,
                  expiresAt: new Date(Date.now() + account.expires_in * 1000),
                }
              });
            } else {
              // Update existing account with new tokens
              await prisma.spotifyAccount.update({
                where: { id: existingAccount.id },
                data: {
                  accessToken: account.access_token,
                  refreshToken: account.refresh_token,
                  expiresAt: new Date(Date.now() + account.expires_in * 1000),
                }
              });
            }
          }
        } catch (error) {
          console.error('Error saving Spotify account:', error);
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      // Always allow sign in
      return true;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
