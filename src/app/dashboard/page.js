'use client';

import { useSession, signOut } from 'next-auth/react';
import SpotifyAccounts from '../components/SpotifyAccounts';

export default function Dashboard() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Signed in as {session?.user?.email}
              </span>
              <button
                onClick={() => signOut()}
                className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-full hover:bg-gray-300 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
          <SpotifyAccounts />
        </div>
      </div>
    </div>
  );
} 