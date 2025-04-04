'use client';

import { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';

export default function SpotifyAccounts() {
  const { data: session, status } = useSession();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await fetch('/api/spotify/accounts');
        if (!response.ok) throw new Error('Failed to fetch accounts');
        const data = await response.json();
        setAccounts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchAccounts();
    }
  }, [status]);

  const connectSpotify = async (e) => {
    e.preventDefault();
    console.log('Starting Spotify auth flow...');
    
    // Use signIn with redirect: true to properly go through the OAuth flow
    await signIn('spotify', { 
      callbackUrl: '/dashboard',
      redirect: true
    });
    
    // The code below won't execute immediately because the redirect happens
  };

  if (status === 'loading' || loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Your Spotify Accounts</h2>
        {accounts.length > 0 && (
          <button
            onClick={connectSpotify}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
          >
            Connect Another Account
          </button>
        )}
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-gray-600 mb-4">No Spotify accounts connected</p>
          <button
            onClick={connectSpotify}
            className="px-6 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
          >
            Connect Spotify Account
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {accounts.map((account) => (
            <div key={account.id} className="border p-4 rounded-lg">
              {account.imageUrl && (
                <img
                  src={account.imageUrl}
                  alt={account.displayName}
                  className="w-12 h-12 rounded-full"
                />
              )}
              <h3 className="font-semibold">{account.displayName}</h3>
              <p className="text-sm text-gray-600">{account.email}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 