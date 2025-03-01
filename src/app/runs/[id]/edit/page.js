'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function EditRun() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  
  // Form state
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [distance, setDistance] = useState('');
  const [distanceUnit, setDistanceUnit] = useState('km');
  const [pace, setPace] = useState('');
  const [playlist, setPlaylist] = useState(null);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const prevUnit = useRef(distanceUnit);
  
  useEffect(() => {
    const fetchRunDetails = async () => {
      if (!params.id) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/runs/${params.id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch run details');
        }
        
        const run = await response.json();
        
        // Populate form with run data
        setName(run.name);
        setDate(new Date(run.date).toISOString().split('T')[0]);
        setDistance(run.distance.toString());
        setDistanceUnit(run.distanceUnit);
        setPace(run.pace);
        
        // Fetch the playlist details if available
        if (run.playlistId) {
          const playlistResponse = await fetch(`/api/spotify/playlists/${run.playlistId}`);
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
    
    // Calculate total duration in minutes
    const distanceValue = parseFloat(distance);
    const durationMinutes = distanceValue * paceInMinutes;
    
    // Convert to hours and minutes
    const hours = Math.floor(durationMinutes / 60);
    const minutes = Math.round(durationMinutes % 60);
    
    return `${hours}h ${minutes}m`;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!playlist) return;
    
    try {
      setSaving(true);
      setError(null);
      
      console.log('Updating run data:', {
        name,
        date,
        distance: parseFloat(distance),
        distanceUnit,
        pace,
        estimatedDuration: calculateDuration(),
      });
      
      const response = await fetch(`/api/runs/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          date,
          distance: parseFloat(distance),
          distanceUnit,
          pace,
          estimatedDuration: calculateDuration(),
        }),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('Server error response:', responseData);
        throw new Error(responseData.error || `Failed to update run (${response.status})`);
      }
      
      // Redirect to the run details page
      router.push(`/runs/${params.id}`);
      
    } catch (err) {
      console.error('Error updating run:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
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
  
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Edit Run</h1>
            <Link href={`/runs/${params.id}`} className="text-blue-600 hover:underline">
              Cancel
            </Link>
          </div>
          
          {playlist && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start space-x-4">
                {playlist.images && playlist.images[0] && (
                  <img 
                    src={playlist.images[0].url} 
                    alt={playlist.name} 
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
                <div>
                  <h3 className="font-medium">Playlist: {playlist.name}</h3>
                  <p className="text-sm text-gray-500">{playlist.tracks.total} tracks • By {playlist.owner.display_name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Note: The playlist cannot be changed. If you want to use a different playlist, please create a new run.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Run Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                  Date
                </label>
                <input
                  type="date"
                  id="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="distance" className="block text-sm font-medium text-gray-700">
                    Distance
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                      type="number"
                      id="distance"
                      value={distance}
                      onChange={(e) => setDistance(e.target.value)}
                      step="0.01"
                      min="0.1"
                      className="flex-1 block w-full px-3 py-2 border border-r-0 border-gray-300 rounded-l-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <select
                      value={distanceUnit}
                      onChange={(e) => setDistanceUnit(e.target.value)}
                      className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 bg-gray-50 text-gray-500 rounded-r-md"
                    >
                      <option value="km">km</option>
                      <option value="mi">mi</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="pace" className="block text-sm font-medium text-gray-700">
                    Target Pace
                  </label>
                  <input
                    type="text"
                    id="pace"
                    value={pace}
                    onChange={(e) => setPace(e.target.value)}
                    placeholder="5:00"
                    pattern="[0-9]+:[0-5][0-9]"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
              
              <div className="flex justify-end space-x-3 pt-6 mt-6 border-t">
                <Link
                  href={`/runs/${params.id}`}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 