'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function RunDetails() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [run, setRun] = useState(null);
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRunDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/runs/${params.id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch run details');
        }
        
        const data = await response.json();
        setRun(data);
        
        // Fetch the playlist details
        if (data.playlistId) {
          const playlistResponse = await fetch(`/api/spotify/playlists/${data.playlistId}`);
          if (playlistResponse.ok) {
            const playlistData = await playlistResponse.json();
            setPlaylist(playlistData);
          }
        }
      } catch (err) {
        console.error('Error fetching run:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (status === 'authenticated' && params.id) {
      fetchRunDetails();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [params.id, router, status]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p>Loading run details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-red-500">Error: {error}</p>
            <Link href="/dashboard" className="text-blue-600 hover:underline mt-4 inline-block">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p>Run not found</p>
            <Link href="/dashboard" className="text-blue-600 hover:underline mt-4 inline-block">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">{run.name}</h1>
            <Link href="/dashboard" className="text-blue-600 hover:underline">
              Back to Dashboard
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h2 className="text-lg font-medium mb-4">Run Details</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p>{formatDate(run.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Distance</p>
                  <p>{run.distance} {run.distanceUnit}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Target Pace</p>
                  <p>{run.pace} min/{run.distanceUnit}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Estimated Duration</p>
                  <p>{run.estimatedDuration}</p>
                </div>
              </div>
            </div>
            
            {playlist && (
              <div>
                <h2 className="text-lg font-medium mb-4">Playlist</h2>
                <div className="flex items-start space-x-4">
                  {playlist.images && playlist.images[0] && (
                    <img 
                      src={playlist.images[0].url} 
                      alt={playlist.name} 
                      className="w-24 h-24 object-cover rounded"
                    />
                  )}
                  <div>
                    <p className="font-medium">{playlist.name}</p>
                    <p className="text-sm text-gray-500">{playlist.tracks.total} tracks</p>
                    <p className="text-sm text-gray-500">By {playlist.owner.display_name}</p>
                    <a 
                      href={playlist.external_urls.spotify} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-green-600 hover:underline text-sm mt-2 inline-block"
                    >
                      Open in Spotify
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="border-t pt-6">
            <h2 className="text-lg font-medium mb-4">Ready to Run?</h2>
            <p className="mb-4">
              When you're ready to start your run, open the Spotify app and play this playlist.
              Try to maintain your target pace of {run.pace} min/{run.distanceUnit} to complete your 
              {run.distance} {run.distanceUnit} run in {run.estimatedDuration}.
            </p>
            
            <div className="flex space-x-4">
              <a 
                href={playlist?.external_urls.spotify} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Open Playlist in Spotify
              </a>
              <button
                onClick={() => router.push(`/runs/${run.id}/edit`)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Edit Run
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 