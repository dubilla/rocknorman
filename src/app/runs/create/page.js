'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function CreateRun() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playlist, setPlaylist] = useState(null);
  const [playlistTracks, setPlaylistTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [tracksError, setTracksError] = useState(null);
  
  // Form state
  const [distance, setDistance] = useState('5');
  const [distanceUnit, setDistanceUnit] = useState('km');
  const [pace, setPace] = useState('5:00');
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const playlistId = searchParams.get('playlist');
  
  const prevUnit = useRef(distanceUnit);
  
  useEffect(() => {
    const fetchPlaylistDetails = async () => {
      if (!playlistId) {
        router.push('/dashboard');
        return;
      }
      
      try {
        setLoading(true);
        const response = await fetch(`/api/spotify/playlists/${playlistId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch playlist details');
        }
        
        const data = await response.json();
        setPlaylist(data);
        setName(`${data.name} Run`); // Default name based on playlist
      } catch (err) {
        console.error('Error fetching playlist:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (status === 'authenticated' && playlistId) {
      fetchPlaylistDetails();
    }
  }, [playlistId, router, status]);
  
  useEffect(() => {
    if (pace && distanceUnit) {
      const [paceMinutes, paceSeconds] = pace.split(':').map(Number);
      const paceInMinutes = paceMinutes + (paceSeconds / 60);
      
      let newPaceInMinutes;
      if (distanceUnit === 'km' && prevUnit.current === 'mi') {
        newPaceInMinutes = paceInMinutes * 0.621371;
      } else if (distanceUnit === 'mi' && prevUnit.current === 'km') {
        newPaceInMinutes = paceInMinutes / 0.621371;
      } else {
        return;
      }
      
      const newPaceMinutes = Math.floor(newPaceInMinutes);
      const newPaceSeconds = Math.round((newPaceInMinutes - newPaceMinutes) * 60);
      setPace(`${newPaceMinutes}:${newPaceSeconds.toString().padStart(2, '0')}`);
    }
    
    prevUnit.current = distanceUnit;
  }, [distanceUnit]);
  
  const calculateDuration = () => {
    // Parse pace (e.g., "5:00" to minutes)
    const [paceMinutes, paceSeconds] = pace.split(':').map(Number);
    const paceInMinutes = paceMinutes + (paceSeconds / 60);
    
    // Calculate total duration in minutes based on the selected unit
    // No conversion needed since pace is already in the correct unit (min/km or min/mi)
    const distanceValue = parseFloat(distance);
    const durationMinutes = distanceValue * paceInMinutes;
    
    // Convert to hours and minutes
    const hours = Math.floor(durationMinutes / 60);
    const minutes = Math.round(durationMinutes % 60);
    
    return `${hours}h ${minutes}m`;
  };
  
  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const getTracksForRun = () => {
    if (!playlistTracks.length) return { tracks: [], includesPartialTrack: false };
    
    // Parse pace to minutes
    const [paceMinutes, paceSeconds] = pace.split(':').map(Number);
    const paceInMinutes = paceMinutes + (paceSeconds / 60);
    
    // Calculate run duration in milliseconds
    const distanceValue = parseFloat(distance);
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
  
  const { tracks: tracksForRun = [], includesPartialTrack = false } = getTracksForRun();
  
  // Calculate total duration of selected tracks (accounting for partial track)
  const totalTracksDuration = tracksForRun.length > 0 ? tracksForRun.reduce((total, item) => {
    // Only count the actual duration that will be played
    return total + (item.endTime - item.startTime);
  }, 0) : 0;

  const totalTracksDurationFormatted = formatDuration(totalTracksDuration);

  // Calculate run duration in milliseconds for comparison
  const [paceMinutes, paceSeconds] = pace.split(':').map(Number);
  const paceInMinutes = paceMinutes + (paceSeconds / 60);
  const distanceValue = parseFloat(distance);
  const runDurationMinutes = distanceValue * paceInMinutes;
  const runDurationMs = runDurationMinutes * 60 * 1000;

  // Calculate coverage percentage (should be close to 100% with partial track)
  const coveragePercentage = Math.min(100, Math.round((totalTracksDuration / runDurationMs) * 100));
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!playlist) return;
    
    try {
      console.log('Submitting run data:', {
        name,
        date,
        distance: parseFloat(distance),
        distanceUnit,
        pace,
        playlistId: playlist.id,
        estimatedDuration: calculateDuration(),
      });
      
      const response = await fetch('/api/runs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          date,
          distance: parseFloat(distance),
          distanceUnit,
          pace,
          playlistId: playlist.id,
          estimatedDuration: calculateDuration(),
        }),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('Server error response:', responseData);
        throw new Error(responseData.error || `Failed to create run (${response.status})`);
      }
      
      // Redirect to the new run page
      router.push(`/runs/${responseData.id}`);
      
    } catch (err) {
      console.error('Error creating run:', err);
      alert(`Error creating run: ${err.message}`);
    }
  };
  
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
  
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-2xl font-bold mb-6">Create a New Run</h1>
        
        {playlist && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h2 className="font-medium">Selected Playlist: {playlist.name}</h2>
            <p className="text-sm text-gray-600">
              {playlist.tracks.total} tracks • {playlist.owner.display_name}
            </p>
          </div>
        )}
        
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2">About Pace</h3>
          <p className="text-sm text-gray-600">
            Enter your target pace as minutes and seconds per {distanceUnit}. For example:
          </p>
          <ul className="text-sm text-gray-600 mt-2 list-disc list-inside">
            <li>5:00 means 5 minutes per {distanceUnit}</li>
            <li>8:30 means 8 minutes and 30 seconds per {distanceUnit}</li>
          </ul>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Run Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Distance
                </label>
                <div className="flex">
                  <input
                    type="number"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    step="0.1"
                    min="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-l-md"
                    required
                  />
                  <select
                    value={distanceUnit}
                    onChange={(e) => setDistanceUnit(e.target.value)}
                    className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50"
                  >
                    <option value="km">km</option>
                    <option value="mi">mi</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Pace (min/{distanceUnit})
                </label>
                <input
                  type="text"
                  value={pace}
                  onChange={(e) => setPace(e.target.value)}
                  placeholder="5:00"
                  pattern="[0-9]+:[0-5][0-9]"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Format: MM:SS per {distanceUnit}</p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="font-medium mb-2">Estimated Duration</h3>
              <p className="text-lg">{calculateDuration()}</p>
              <p className="text-xs text-gray-500 mt-1">
                Based on your distance and pace
              </p>
            </div>
            
            <div className="mt-6">
              <h3 className="font-medium mb-2">Songs You'll Hear During Your Run</h3>
              
              {loadingTracks ? (
                <p className="text-sm text-gray-500">Loading tracks...</p>
              ) : tracksError ? (
                <p className="text-sm text-red-500">Error loading tracks: {tracksError}</p>
              ) : tracksForRun.length === 0 ? (
                <p className="text-sm text-gray-500">No tracks will play during this run. Try a longer distance or slower pace.</p>
              ) : (
                <>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Music Coverage</span>
                      <span className="text-sm">{coveragePercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-green-600 h-2.5 rounded-full" 
                        style={{ width: `${coveragePercentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {totalTracksDurationFormatted} of music for a {calculateDuration()} run
                    </p>
                    {includesPartialTrack && (
                      <p className="text-xs text-amber-600 mt-1">
                        Note: Your run will end during the last song in this list
                      </p>
                    )}
                  </div>
                  
                  <div className="bg-white rounded border overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            #
                          </th>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Title
                          </th>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Artist
                          </th>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Duration
                          </th>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Time in Run
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {tracksForRun.map((item, index) => (
                          <tr 
                            key={item.track.id || index} 
                            className={`hover:bg-gray-50 ${!item.willComplete ? 'bg-yellow-50' : ''}`}
                          >
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                              {index + 1}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{item.track.name}</div>
                              <div className="text-xs text-gray-500">{item.track.album.name}</div>
                              {!item.willComplete && (
                                <div className="text-xs text-amber-600 font-medium mt-1">
                                  {item.percentComplete}% complete
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {item.track.artists.map(artist => artist.name).join(', ')}
                              </div>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                              {formatDuration(item.track.duration_ms)}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                              {formatDuration(item.startTime)} - {formatDuration(item.endTime)}
                              {!item.willComplete && (
                                <div className="text-xs text-amber-600">
                                  (run ends during this song)
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 pt-6 mt-6 border-t">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Run
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 