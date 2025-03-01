'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import SpotifyAccounts from '../components/SpotifyAccounts';
import SpotifyPlaylists from '../components/SpotifyPlaylists';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const { data: session } = useSession();
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistTracks, setPlaylistTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [tracksError, setTracksError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchPlaylistTracks = async () => {
      if (!selectedPlaylist) {
        setPlaylistTracks([]);
        return;
      }

      try {
        setLoadingTracks(true);
        setTracksError(null);
        
        const response = await fetch(`/api/spotify/playlists/${selectedPlaylist.id}/tracks`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch tracks');
        }
        
        const data = await response.json();
        setPlaylistTracks(data.items || []);
      } catch (err) {
        console.error('Error fetching playlist tracks:', err);
        setTracksError(err.message);
      } finally {
        setLoadingTracks(false);
      }
    };

    if (selectedPlaylist) {
      fetchPlaylistTracks();
    }
  }, [selectedPlaylist]);

  const handleSelectPlaylist = (playlist) => {
    setSelectedPlaylist(playlist);
    console.log('Selected playlist:', playlist);
  };

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-medium text-lg">Selected Playlist: {selectedPlaylist.name}</h3>
                  <p className="text-sm text-gray-600">
                    {selectedPlaylist.tracks.total} tracks • Created by {selectedPlaylist.owner.display_name}
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => setSelectedPlaylist(null)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear Selection
                  </button>
                  <button
                    onClick={() => router.push(`/runs/create?playlist=${selectedPlaylist.id}`)}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                  >
                    Create Run with Playlist
                  </button>
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="font-medium mb-2">Preview Tracks</h4>
                {loadingTracks ? (
                  <p className="text-sm text-gray-500">Loading tracks...</p>
                ) : tracksError ? (
                  <p className="text-sm text-red-500">Error: {tracksError}</p>
                ) : playlistTracks.length === 0 ? (
                  <p className="text-sm text-gray-500">No tracks found in this playlist</p>
                ) : (
                  <div className="bg-white rounded border overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            #
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Title
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Artist
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Duration
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {playlistTracks.map((item, index) => (
                          <tr key={item.track.id || index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {index + 1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{item.track.name}</div>
                              <div className="text-sm text-gray-500">{item.track.album.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {item.track.artists.map(artist => artist.name).join(', ')}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDuration(item.track.duration_ms)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <SpotifyPlaylists onSelectPlaylist={handleSelectPlaylist} />
        </div>
      </div>
    </div>
  );
} 