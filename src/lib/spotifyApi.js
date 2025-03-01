/**
 * Makes a request to the Spotify API with automatic token refresh
 * @param {string} endpoint - The Spotify API endpoint (without the base URL)
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} - The response data
 */
export async function spotifyApiRequest(endpoint, options = {}) {
  // First attempt with current token
  const response = await fetch(`https://api.spotify.com/v1${endpoint}`, options);
  
  // If unauthorized, try refreshing the token
  if (response.status === 401) {
    const refreshResponse = await fetch('/api/spotify/refresh', {
      method: 'POST',
    });
    
    if (!refreshResponse.ok) {
      throw new Error('Failed to refresh token');
    }
    
    // Retry the original request with the new token
    const retryResponse = await fetch(`https://api.spotify.com/v1${endpoint}`, options);
    
    if (!retryResponse.ok) {
      const errorData = await retryResponse.json();
      throw new Error(errorData.error?.message || 'Spotify API request failed');
    }
    
    return retryResponse.json();
  }
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Spotify API request failed');
  }
  
  return response.json();
} 