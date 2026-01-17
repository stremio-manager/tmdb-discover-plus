import { useState, useEffect } from 'react';

/**
 * Hook to fetch watch providers (streaming services) from TMDB.
 * @param {Object} props
 * @param {string} props.type 'movie' or 'series'
 * @param {string} props.region Country code (e.g. 'US')
 * @param {Function} props.getWatchProviders API function to fetch providers
 */
export function useWatchProviders({ type, region, getWatchProviders }) {
  const [watchProviders, setWatchProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProviders = async () => {
      if (!region || !getWatchProviders) {
        setWatchProviders([]);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        // TMDB API expects 'movie' or 'tv', our app uses 'series' sometimes, 
        // but getWatchProviders likely handles it or expects 'movie'/'tv'. 
        // Catalog uses 'movie'/'series'. Assuming utils map 'series'->'tv' if needed,
        // or we pass it as is.
        // Looking at previous code: `localCatalog?.type || 'movie'` was passed.
        const providers = await getWatchProviders(type || 'movie', region);
        
        setWatchProviders(
          providers.map((p) => ({
            id: p.provider_id,
            name: p.provider_name,
            logo: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : null,
          }))
        );
      } catch (err) {
        console.error('Failed to load providers:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadProviders();
  }, [type, region, getWatchProviders]);

  return { watchProviders, loading, error };
}
