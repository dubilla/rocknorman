'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import SpotifyAccounts from '../components/SpotifyAccounts';
import SpotifyPlaylists from '../components/SpotifyPlaylists';

export default function Dashboard() {
  const { data: session } = useSession();
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);

  const handleSelectPlaylist = (playlist) => {
    setSelectedPlaylist(playlist);
    // Here you would typically open a modal or navigate to a form
    // to associate this playlist with a run
    console.log('Selected playlist:', playlist);
  };

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
          
          {selectedPlaylist && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium">Selected Playlist: {selectedPlaylist.name}</h3>
              <p className="text-sm text-gray-600">
                {selectedPlaylist.tracks.total} tracks • Created by {selectedPlaylist.owner.display_name}
              </p>
              <button 
                onClick={() => setSelectedPlaylist(null)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Clear Selection
              </button>
            </div>
          )}
          
          <SpotifyPlaylists onSelectPlaylist={handleSelectPlaylist} />
        </div>
      </div>
    </div>
  );
} 