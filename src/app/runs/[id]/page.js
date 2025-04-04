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
  const [playlistTracks, setPlaylistTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [error, setError] = useState(null);
  const [tracksError, setTracksError] = useState(null);
  const [activeTab, setActiveTab] = useState('tracks');

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
    
    if (status === 'authenticated') {
      fetchRunDetails();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [params.id, router, status]);
  
  useEffect(() => {
    const fetchPlaylistTracks = async () => {
      if (!playlist) return;
      
      try {
        setLoadingTracks(true);
        const response = await fetch(`/api/spotify/playlists/${playlist.id}/tracks?limit=50`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch playlist tracks');
        }
        
        const data = await response.json();
        setPlaylistTracks(data.items || []);
      } catch (err) {
        console.error('Error fetching tracks:', err);
        setTracksError(err.message);
      } finally {
        setLoadingTracks(false);
      }
    };
    
    if (playlist) {
      fetchPlaylistTracks();
    }
  }, [playlist]);
  
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  const formatDuration = (ms) => {
    if (!ms) return '0:00';
    
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const getTracksForRun = () => {
    if (!run || !playlistTracks.length) return { tracks: [], includesPartialTrack: false };
    
    // Parse pace to minutes
    const [paceMinutes, paceSeconds] = run.pace.split(':').map(Number);
    const paceInMinutes = paceMinutes + (paceSeconds / 60);
    
    // Calculate run duration in milliseconds
    const distanceValue = parseFloat(run.distance);
    const durationMinutes = distanceValue * paceInMinutes;
    const durationMs = durationMinutes * 60 * 1000;
    
    // Calculate cumulative duration and return tracks that fit within the run time
    let cumulativeDuration = 0;
    const tracksForRun = [];
    let includesPartialTrack = false;
    
    for (const item of playlistTracks) {
      const trackDuration = item.track.duration_ms;
      const willCompleteTrack = cumulativeDuration + trackDuration <= durationMs;
      
      // Add track with metadata about whether it will complete
      tracksForRun.push({
        ...item,
        startTime: cumulativeDuration,
        endTime: willCompleteTrack ? cumulativeDuration + trackDuration : durationMs,
        willComplete: willCompleteTrack,
        percentComplete: willCompleteTrack ? 100 : Math.round(((durationMs - cumulativeDuration) / trackDuration) * 100)
      });
      
      cumulativeDuration += trackDuration;
      
      // If this track won't complete, mark it and stop adding tracks
      if (!willCompleteTrack) {
        includesPartialTrack = true;
        break;
      }
    }
    
    return { tracks: tracksForRun, includesPartialTrack };
  };
  
  const { tracks: tracksForRun = [], includesPartialTrack = false } = getTracksForRun();
  
  // Calculate total duration of selected tracks (accounting for partial track)
  const totalTracksDuration = tracksForRun.length > 0 ? tracksForRun.reduce((total, item) => {
    // Only count the actual duration that will be played
    return total + (item.endTime - item.startTime);
  }, 0) : 0;
  
  const totalTracksDurationFormatted = formatDuration(totalTracksDuration);
  
  // Calculate run duration in milliseconds for comparison
  const runDurationMs = run ? (() => {
    const [paceMinutes, paceSeconds] = run.pace.split(':').map(Number);
    const paceInMinutes = paceMinutes + (paceSeconds / 60);
    const distanceValue = parseFloat(run.distance);
    return distanceValue * paceInMinutes * 60 * 1000;
  })() : 0;
  
  // Calculate coverage percentage (should be close to 100% with partial track)
  const coveragePercentage = Math.min(100, Math.round((totalTracksDuration / runDurationMs) * 100));
  
  // Add this function to calculate mile/km markers for each track
  const getTracksWithDistanceMarkers = () => {
    if (!run || !playlistTracks.length) return [];
    
    // Parse pace to minutes per distance unit
    const [paceMinutes, paceSeconds] = run.pace.split(':').map(Number);
    const paceInMinutes = paceMinutes + (paceSeconds / 60);
    
    // Calculate how long it takes to cover one unit of distance (km or mile)
    const minutesPerUnit = paceInMinutes; // e.g., 5 minutes per km
    const msPerUnit = minutesPerUnit * 60 * 1000; // milliseconds per km/mile
    
    // Get tracks that will play during the run
    const { tracks } = getTracksForRun();
    
    // Add distance markers to each track
    return tracks.map(track => {
      const startDistance = track.startTime / msPerUnit;
      const endDistance = track.endTime / msPerUnit;
      
      // Format distance markers with one decimal place
      const startDistanceFormatted = startDistance.toFixed(1);
      const endDistanceFormatted = endDistance.toFixed(1);
      
      // Calculate which distance units this track spans
      const startUnit = Math.floor(startDistance);
      const endUnit = Math.ceil(endDistance);
      const distanceUnits = [];
      
      for (let i = startUnit; i < endUnit; i++) {
        // Only include units that are within the run distance
        if (i <= parseFloat(run.distance)) {
          distanceUnits.push(i);
        }
      }
      
      return {
        ...track,
        startDistance,
        endDistance,
        startDistanceFormatted,
        endDistanceFormatted,
        distanceUnits,
      };
    });
  };

  // Get tracks with distance markers
  const tracksWithMarkers = getTracksWithDistanceMarkers();

  // Group tracks by distance unit (km or mile)
  const tracksByDistanceUnit = {};
  tracksWithMarkers.forEach(track => {
    track.distanceUnits.forEach(unit => {
      if (!tracksByDistanceUnit[unit]) {
        tracksByDistanceUnit[unit] = [];
      }
      tracksByDistanceUnit[unit].push(track);
    });
  });
  
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-sm max-w-md w-full">
          <h1 className="text-red-500 text-xl font-bold mb-4">Error</h1>
          <p>{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  if (!run) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Run not found</p>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">{run.name}</h1>
          <Link 
            href="/dashboard" 
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Back to Dashboard
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h2 className="text-lg font-medium mb-2">Distance</h2>
            <p className="text-3xl font-bold">{run.distance} {run.distanceUnit}</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h2 className="text-lg font-medium mb-2">Target Pace</h2>
            <p className="text-3xl font-bold">{run.pace} min/{run.distanceUnit}</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <h2 className="text-lg font-medium mb-2">Duration</h2>
            <p className="text-3xl font-bold">{run.estimatedDuration}</p>
          </div>
        </div>
        
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Run Details</h2>
            <p className="text-sm text-gray-500">Created on {formatDate(run.date)}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
            
            <div>
              <h2 className="text-lg font-medium mb-4">Your Run Soundtrack</h2>
              {loadingTracks ? (
                <p className="text-sm text-gray-500">Loading tracks...</p>
              ) : tracksError ? (
                <p className="text-sm text-red-500">Error loading tracks: {tracksError}</p>
              ) : tracksForRun.length === 0 ? (
                <p className="text-sm text-gray-500">No tracks available for this run.</p>
              ) : (
                <div>
                  <div className="mb-3 text-sm text-gray-600">
                    <span className="font-medium">Music duration:</span> {totalTracksDurationFormatted} ({coveragePercentage}% of run)
                  </div>
                  
                  {/* Tab navigation for different views */}
                  <div className="mb-4 border-b">
                    <nav className="-mb-px flex space-x-8">
                      <button
                        onClick={() => setActiveTab('tracks')}
                        className={`pb-2 px-1 ${
                          activeTab === 'tracks'
                            ? 'border-b-2 border-blue-500 text-blue-600 font-medium'
                            : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        Track List
                      </button>
                      <button
                        onClick={() => setActiveTab('byDistance')}
                        className={`pb-2 px-1 ${
                          activeTab === 'byDistance'
                            ? 'border-b-2 border-blue-500 text-blue-600 font-medium'
                            : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        By {run.distanceUnit}
                      </button>
                    </nav>
                  </div>
                  
                  {/* Track list view */}
                  {activeTab === 'tracks' && (
                    <div className="max-h-80 overflow-y-auto border rounded-md">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              #
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Track
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Duration
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {run.distanceUnit} Marker
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {tracksWithMarkers.map((item, index) => (
                            <tr key={item.track.id} className={!item.willComplete ? 'bg-yellow-50' : ''}>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                {index + 1}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{item.track.name}</div>
                                <div className="text-xs text-gray-500">{item.track.artists.map(a => a.name).join(', ')}</div>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                {formatDuration(item.track.duration_ms)}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">
                                <span className="text-gray-700">
                                  {item.startDistanceFormatted} - {item.endDistanceFormatted} {run.distanceUnit}
                                </span>
                                {!item.willComplete && (
                                  <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                    {item.percentComplete}%
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  {/* By distance view */}
                  {activeTab === 'byDistance' && (
                    <div className="max-h-80 overflow-y-auto border rounded-md">
                      <div className="divide-y divide-gray-200">
                        {Object.keys(tracksByDistanceUnit)
                          .sort((a, b) => parseInt(a) - parseInt(b))
                          .map(unit => (
                            <div key={unit} className="p-4">
                              <h3 className="font-medium text-gray-900 mb-2">
                                {unit} {parseInt(unit) === 1 ? run.distanceUnit : `${run.distanceUnit}s`}
                              </h3>
                              <div className="space-y-2">
                                {tracksByDistanceUnit[unit].map(item => (
                                  <div 
                                    key={`${unit}-${item.track.id}`} 
                                    className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50"
                                  >
                                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                      <span className="text-xs font-medium text-green-800">
                                        {Math.round((item.endDistance - Math.max(item.startDistance, parseInt(unit))) / 
                                          (Math.min(item.endDistance, parseInt(unit) + 1) - Math.max(item.startDistance, parseInt(unit))) * 100)}%
                                      </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {item.track.name}
                                      </p>
                                      <p className="text-xs text-gray-500 truncate">
                                        {item.track.artists.map(a => a.name).join(', ')}
                                      </p>
                                    </div>
                                    <div className="flex-shrink-0 text-xs text-gray-500">
                                      {formatDuration(item.track.duration_ms)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="border-t pt-6">
          <h2 className="text-lg font-medium mb-4">Ready to Run?</h2>
          <p className="mb-4">
            When you're ready to start your run, open the Spotify app and play this playlist.
            Try to maintain your target pace of {run.pace} min/{run.distanceUnit} to complete your {' '}
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
  );
} 