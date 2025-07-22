import { calculateRegionStats } from '../utils/mapboxData';

export const amsterdamRegions = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        name: 'Centre',
        description: 'The historic heart of Amsterdam, featuring iconic canals and vibrant street art in unexpected corners.',
        featuredInfo: 'Home to STRAAT Museum and numerous hidden gems in the Jordaan neighborhood.',
        aliases: ['Center'] // Alternative names
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [4.8850, 52.3800],
          [4.9100, 52.3800],
          [4.9100, 52.3650],
          [4.8850, 52.3650],
          [4.8850, 52.3800]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Noord',
        description: 'Amsterdam Noord is the street art capital with massive murals and the famous NDSM wharf.',
        featuredInfo: 'NDSM wharf is a creative hub with legal walls and stunning large-scale murals.',
        aliases: ['North'] // Alternative names
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [4.8800, 52.3900],
          [4.9200, 52.3900],
          [4.9200, 52.4100],
          [4.8800, 52.4100],
          [4.8800, 52.3900]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'South',
        description: 'Zuid features upscale street art and the MOCO Museum with works by Banksy.',
        featuredInfo: 'Visit MOCO Museum for contemporary street art exhibitions.',
        aliases: ['Zuid']
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [4.8700, 52.3400],
          [4.9000, 52.3400],
          [4.9000, 52.3600],
          [4.8700, 52.3600],
          [4.8700, 52.3400]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'East',
        description: 'Oost is a multicultural district with diverse street art reflecting its communities.',
        featuredInfo: 'Javastraat and Dappermarkt area showcase international street art styles.',
        aliases: ['Oost']
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [4.9200, 52.3600],
          [4.9600, 52.3600],
          [4.9600, 52.3750],
          [4.9200, 52.3750],
          [4.9200, 52.3600]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'West',
        description: 'West Amsterdam combines industrial heritage with contemporary urban art.',
        featuredInfo: 'The Westerpark area hosts regular street art festivals and events.',
        aliases: ['Westerpark']
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [4.8400, 52.3700],
          [4.8700, 52.3700],
          [4.8700, 52.3850],
          [4.8400, 52.3850],
          [4.8400, 52.3700]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'South-East',
        description: 'Zuidoost showcases vibrant murals celebrating cultural diversity.',
        featuredInfo: 'Bijlmer area features powerful community-driven street art projects.',
        aliases: ['Zuidoost']
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [4.9300, 52.3200],
          [4.9700, 52.3200],
          [4.9700, 52.3400],
          [4.9300, 52.3400],
          [4.9300, 52.3200]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Nieuw-West',
        description: 'Nieuw-West is an emerging street art destination with fresh perspectives and innovative works.',
        featuredInfo: 'Emerging artists and experimental street art installations.',
        aliases: ['New-West']
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [4.8000, 52.3600],
          [4.8400, 52.3600],
          [4.8400, 52.3800],
          [4.8000, 52.3800],
          [4.8000, 52.3600]
        ]]
      }
    }
  ]
};

// Cache for region statistics
let regionStatsCache = null;
let lastStatsUpdate = 0;
const STATS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get region statistics dynamically from Mapbox data
export const getRegionStats = async (regionName = null) => {
  const now = Date.now();
  
  // Return cached stats if still valid
  if (regionStatsCache && (now - lastStatsUpdate) < STATS_CACHE_DURATION) {
    if (regionName) {
      return regionStatsCache[regionName] || getDefaultStats();
    }
    return regionStatsCache;
  }
  
  try {
    console.log('🔄 Fetching fresh region statistics from Mapbox...');
    const stats = await calculateRegionStats(regionName);
    
    // Update cache
    regionStatsCache = stats;
    lastStatsUpdate = now;
    
    if (regionName) {
      return stats[regionName] || getDefaultStats();
    }
    return stats;
  } catch (error) {
    console.error('❌ Failed to fetch region stats, using defaults:', error);
    if (regionName) {
      return getDefaultStats();
    }
    return getDefaultStatsForAllRegions();
  }
};

// Default statistics fallback
const getDefaultStats = () => ({
  totalLocations: 0,
  types: {}
});

const getDefaultStatsForAllRegions = () => ({
  'Centre': getDefaultStats(),
  'Noord': getDefaultStats(),
  'South': getDefaultStats(),
  'East': getDefaultStats(),
  'West': getDefaultStats(),
  'South-East': getDefaultStats(),
  'Nieuw-West': getDefaultStats()
});

// Clear cache (useful for testing or when data is updated)
export const clearRegionStatsCache = () => {
  regionStatsCache = null;
  lastStatsUpdate = 0;
};
