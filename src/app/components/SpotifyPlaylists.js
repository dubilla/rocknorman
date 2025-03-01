'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function SpotifyPlaylists({ onSelectPlaylist }) {
  const { data: session, status } = useSession();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/spotify/playlists');
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch playlists');
        }
        
        const data = await response.json();
        setPlaylists(data.items || []);
      } catch (err) {
        console.error('Error fetching playlists:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchPlaylists();
    }
  }, [status]);

  if (status === 'loading' || loading) {
    return <div className="py-4">Loading playlists...</div>;
  }

  if (error) {
    return <div className="py-4 text-red-500">Error: {error}</div>;
  }

  if (playlists.length === 0) {
    return <div className="py-4">No playlists found. Create some in Spotify first!</div>;
  }

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4">Your Spotify Playlists</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {playlists.map(playlist => (
          <div 
            key={playlist.id}
            className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => onSelectPlaylist(playlist)}
          >
            <div className="flex items-center space-x-3">
              {playlist.images && playlist.images[0] ? (
                <img 
                  src={playlist.images[0].url} 
                  alt={playlist.name} 
                  className="w-16 h-16 object-cover rounded"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                  <span className="text-gray-500">No Image</span>
                </div>
              )}
              <div>
                <h3 className="font-medium">{playlist.name}</h3>
                <p className="text-sm text-gray-500">
                  {playlist.tracks.total} tracks
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 