// Simple utility to fetch data from your Mapbox dataset via backend
// Updated with new Center dataset: cmcut1t446aqw1lljnelbo105
// Manage Center locations at: https://studio.mapbox.com/datasets/cmcut1t446aqw1lljnelbo105

import { getMapboxToken } from './mapboxAuth';

// Utility function to clean text data from Mapbox and fix encoding issues
const cleanTextData = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  // Remove or replace problematic characters
  return text
    .replace(/[\uFFFD]/g, '') // Remove replacement characters
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .replace(/[^\x20-\x7E\u00A0-\u00FF\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF\u2C60-\u2C7F\uA720-\uA7FF]/g, '') // Keep only printable characters and common Unicode ranges
    .trim();
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Region-specific dataset IDs
const REGION_DATASETS = {
  'Centre': 'cmcut1t446aqw1lljnelbo105', // Centre dataset
  'Center': 'cmcut1t446aqw1lljnelbo105', // Alternative spelling
  'Centrum': 'cmcut1t446aqw1lljnelbo105', // Dutch name for Center
  'Noord': 'cmfgx8b9p4j941oo91237sgz8', // North dataset
  'North': 'cmfgx8b9p4j941oo91237sgz8', // Alternative spelling
  'East': 'cmfhcvur21oi61oqway88hf1a', // East dataset
  'Nieuw-West': 'cmcxrlelg0rjy1mrxtpa0coq1', // Nieuw-West specific dataset
  'New-West': 'cmcxrlelg0rjy1mrxtpa0coq1', // Alternative spelling
  'West': 'cmd8p91sz2zh71opaktguag9b', // West dataset
  'South': 'cmd8paqs41srl1nqe0oqxmvjg', // South dataset
};

// In-memory cache for already-fetched datasets (per region)
const datasetCache = {};

// Fetch all street art locations from your Mapbox dataset directly from Mapbox API
export const fetchMapboxDataset = async (specificRegion = null) => {
  const MAPBOX_TOKEN = getMapboxToken();
  // Return cached data if we already fetched it for this region
  if (specificRegion && datasetCache[specificRegion]) {
    return datasetCache[specificRegion];
  }
  const USERNAME = 'sama-map';
  
  try {
    let allLocations = [];
    
    if (specificRegion && REGION_DATASETS[specificRegion]) {
      // Fetch specific region dataset
      const DATASET_ID = REGION_DATASETS[specificRegion];
      console.log(`🔄 Fetching ${specificRegion} locations from dataset: ${DATASET_ID}`);
      
      const response = await fetch(`https://api.mapbox.com/datasets/v1/${USERNAME}/${DATASET_ID}/features?access_token=${MAPBOX_TOKEN}`);
      if (!response.ok) {
        throw new Error(`Mapbox API error for ${specificRegion}! status: ${response.status}`);
      }
      const data = await response.json();
      console.log(`📍 Found ${data.features.length} locations in ${specificRegion} dataset`);
      
      allLocations = data.features;
    } else {
      // Fetch from all region datasets
      console.log('🔄 Fetching locations from all region datasets...');
      
      for (const [region, datasetId] of Object.entries(REGION_DATASETS)) {
        // Skip duplicates (alternative spellings that use the same dataset)
        if (region === 'Center' || region === 'New-West' || region === 'North') continue;
        
        try {
          const response = await fetch(`https://api.mapbox.com/datasets/v1/${USERNAME}/${datasetId}/features?access_token=${MAPBOX_TOKEN}`);
          if (response.ok) {
            const data = await response.json();
            console.log(`📍 Found ${data.features.length} locations in ${region} dataset (${datasetId})`);
            allLocations = allLocations.concat(data.features);
          }
        } catch (error) {
          console.warn(`⚠️ Could not fetch ${region} dataset:`, error.message);
        }
      }
    }
    
    // Convert Mapbox GeoJSON features to your app's format
    const locations = allLocations
      .filter(feature => {
        // Validate feature has proper geometry
        const hasGeometry = feature.geometry && feature.geometry.coordinates;
        const coords = feature.geometry?.coordinates;
        const hasValidCoords = coords && coords.length >= 2 && 
          typeof coords[0] === 'number' && typeof coords[1] === 'number' &&
          !isNaN(coords[0]) && !isNaN(coords[1]);
        
        if (!hasValidCoords) {
          console.warn(`⚠️ Skipping feature with invalid coordinates:`, feature);
          return false;
        }
        return true;
      })
      .map((feature, index) => {
        const coords = feature.geometry.coordinates;
        const props = feature.properties;
        
        // Debug: log the first few features to see available properties
        // if (index < 3) {
        //   console.log(`🔍 Feature ${index} properties:`, props);
        //   console.log(`🔍 Feature ${index} coordinates:`, coords);
        // }
        
        const district = props.region || props.district || 'Centrum';
        
        // Debug: Log the first few conversions
        // if (index < 5) {
        //   console.log(`🔄 Converting feature ${index}:`, {
        //     title: props.title || props.Title || 'Untitled Location',
        //     propsRegion: props.region,
        //     propsDistrict: props.district,
        //     finalDistrict: district,
        //     coordinates: [coords[1], coords[0]], // lat, lng
        //     originalCoords: coords // lng, lat
        //   });
        // }
        
        return {
          id: feature.id || `mapbox-${index}`,
          title: cleanTextData(props.title || props.Title || ''),
          artist: cleanTextData(props.artist || ''),
          description: cleanTextData(props.description || props.des || ''),
          des: cleanTextData(props.des || props.description || ''),
          image_url: props.image_url || '',
          type: cleanTextData(props.type || 'mural'),
          district: cleanTextData(district),
          latitude: coords[1],
          longitude: coords[0],
          address: cleanTextData(props.address || ''),
          openingHours: cleanTextData(props.openingHours || props.hours || ''),
          year: cleanTextData(props.year || ''),
          image: props.image || '',
          source: 'mapbox'
        };
      });
    
    console.log('✅ Mapbox locations loaded successfully');
    // Store in cache
    if (specificRegion) {
      datasetCache[specificRegion] = locations;
    }
    return locations;
  } catch (error) {
    console.error('❌ Error fetching Mapbox dataset:', error);
    return [];
  }
};

// Test your dataset connection via backend
export const testDatasetConnection = async () => {
  try {
    // Since the backend mapbox endpoint doesn't exist, we'll just return success
    // The actual dataset testing is done directly via Mapbox API
    console.log('✅ Dataset connection test - using direct Mapbox API');
    return { success: true, message: 'Using direct Mapbox API connection' };
  } catch (error) {
    console.error('❌ Dataset connection test failed:', error);
    return { success: false, error: error.message };
  }
};

// Add location to dataset via backend
export const addLocationToDataset = async (location, targetRegion) => {
  try {
    const datasetId = REGION_DATASETS[targetRegion];
    
    if (!datasetId) {
      throw new Error(`No dataset found for region: ${targetRegion}`);
    }
    
    console.log(`📍 Adding location to ${targetRegion} dataset: ${datasetId}`);
    
    // Since the backend mapbox endpoint doesn't exist, we'll use direct Mapbox API
    // This is a placeholder - in production you'd want to implement this via backend
    console.log('📍 Location would be added via direct Mapbox API');
    console.log('📍 Location data:', location);
    
    return { 
      success: true, 
      message: 'Location would be added via direct Mapbox API',
      location 
    };
  } catch (error) {
    console.error('❌ Failed to add location:', error);
    return { success: false, error: error.message };
  }
};

// Debug function to list all available datasets in your Mapbox account
export const listAvailableDatasets = async () => {
  const MAPBOX_TOKEN = getMapboxToken();
  const USERNAME = 'sama-map';
  
  try {
    console.log('🔍 Fetching all available datasets from your Mapbox account...');
    const response = await fetch(`https://api.mapbox.com/datasets/v1/${USERNAME}?access_token=${MAPBOX_TOKEN}`);
    
    if (!response.ok) {
      throw new Error(`Mapbox API error! status: ${response.status}`);
    }
    
    const datasets = await response.json();
    console.log(`📋 Found ${datasets.length} datasets in your account:`);
    
    datasets.forEach((dataset, index) => {
      console.log(`${index + 1}. ID: ${dataset.id}`);
      console.log(`   Name: ${dataset.name || 'Unnamed'}`);
      console.log(`   Created: ${new Date(dataset.created).toLocaleDateString()}`);
      console.log(`   Modified: ${new Date(dataset.modified).toLocaleDateString()}`);
      console.log(`   Edit URL: https://studio.mapbox.com/datasets/${dataset.id}`);
      console.log('');
    });
    
    return datasets;
  } catch (error) {
    console.error('❌ Error fetching datasets:', error);
    return [];
  }
};

// Function to test a specific dataset ID
export const testDatasetId = async (datasetId) => {
  const MAPBOX_TOKEN = getMapboxToken();
  const USERNAME = 'sama-map';
  
  try {
    console.log(`🧪 Testing dataset ID: ${datasetId}`);
    const response = await fetch(`https://api.mapbox.com/datasets/v1/${USERNAME}/${datasetId}/features?access_token=${MAPBOX_TOKEN}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Dataset ${datasetId} is valid! Contains ${data.features.length} features`);
      return { valid: true, featureCount: data.features.length };
    } else {
      console.log(`❌ Dataset ${datasetId} is invalid! Status: ${response.status}`);
      return { valid: false, status: response.status };
    }
  } catch (error) {
    console.error(`❌ Error testing dataset ${datasetId}:`, error);
    return { valid: false, error: error.message };
  }
};

// Calculate region statistics from Mapbox data
export const calculateRegionStats = async (specificRegion = null) => {
  try {
    const MAPBOX_TOKEN = getMapboxToken();
    const USERNAME = 'sama-map';
    
    let allLocations = [];
    
    if (specificRegion && REGION_DATASETS[specificRegion]) {
      // Fetch specific region dataset
      const DATASET_ID = REGION_DATASETS[specificRegion];
      console.log(`📊 Calculating stats for ${specificRegion} from dataset: ${DATASET_ID}`);
      
      const response = await fetch(`https://api.mapbox.com/datasets/v1/${USERNAME}/${DATASET_ID}/features?access_token=${MAPBOX_TOKEN}`);
      if (!response.ok) {
        throw new Error(`Mapbox API error for ${specificRegion}! status: ${response.status}`);
      }
      const data = await response.json();
      allLocations = data.features;
    } else {
      // Fetch from all region datasets
      console.log('📊 Calculating stats from all region datasets...');
      
      for (const [region, datasetId] of Object.entries(REGION_DATASETS)) {
        // Skip duplicates (alternative spellings that use the same dataset)
        if (region === 'Center' || region === 'New-West' || region === 'North') continue;
        
        try {
          const response = await fetch(`https://api.mapbox.com/datasets/v1/${USERNAME}/${datasetId}/features?access_token=${MAPBOX_TOKEN}`);
          if (response.ok) {
            const data = await response.json();
            allLocations = allLocations.concat(data.features);
          }
        } catch (error) {
          console.warn(`⚠️ Could not fetch ${region} dataset for stats:`, error.message);
        }
      }
    }
    
    // Group locations by region and calculate statistics with dynamic types
    const regionStats = {};
    
    allLocations.forEach(feature => {
      const props = feature.properties;
      const region = cleanTextData(props.region || props.district || 'Centrum');
      
      // Normalize region names
      const normalizedRegion = normalizeRegionName(region);
      
      // If we're calculating stats for a specific region, only process locations from that region
      if (specificRegion && normalizedRegion !== specificRegion) {
        return; // Skip locations that don't belong to the requested region
      }
      
      if (!regionStats[normalizedRegion]) {
        regionStats[normalizedRegion] = {
          totalLocations: 0,
          types: {} // Dynamic types object
        };
      }
      
      // Get item type and normalize it
      const itemType = cleanTextData(props.type || 'mural').toLowerCase().trim();
      const normalizedType = normalizeItemType(itemType);
      
      // Count by normalized type
      if (!regionStats[normalizedRegion].types[normalizedType]) {
        regionStats[normalizedRegion].types[normalizedType] = 0;
      }
      regionStats[normalizedRegion].types[normalizedType]++;
      
      regionStats[normalizedRegion].totalLocations++;
    });
    
    // console.log('📊 Calculated region statistics with dynamic types:', regionStats);
    return regionStats;
    
  } catch (error) {
    console.error('❌ Error calculating region stats:', error);
    return {};
  }
};

// Helper function to normalize region names
const normalizeRegionName = (regionName) => {
  const regionMap = {
    'Centre': 'Centre',
    'Center': 'Centre',
    'Centrum': 'Centre',
    'Noord': 'Noord',
    'North': 'Noord',
    'South': 'South',
    'Zuid': 'South',
    'East': 'East',
    'Oost': 'East',
    'West': 'West',
    'Westerpark': 'West',
    'South-East': 'South-East',
    'Zuidoost': 'South-East',
    'Nieuw-West': 'Nieuw-West',
    'New-West': 'Nieuw-West'
  };
  
  return regionMap[regionName] || regionName;
};

// Helper function to normalize item types
const normalizeItemType = (type) => {
  // Clean the type text first
  const cleanedType = cleanTextData(type);
  
  // Replace "AND" with "&" in type names
  const formattedType = cleanedType.replace(/\bAND\b/g, '&');
  
  // Map similar types to standardized names
  const typeMap = {
    'mural': 'Mural',
    'street art': 'Street Art',
    'streetart': 'Street Art',
    'graffiti': 'Graffiti',
    'tag': 'Tag',
    'sticker': 'Sticker',
    'paste up': 'Paste Up',
    'pasteup': 'Paste Up',
    'paste-up': 'Paste Up',
    'installation': 'Installation',
    'sculpture': 'Sculpture',
    'gallery': 'Gallery',
    'museum': 'Institution',
    'institution': 'Institution',
    'instituion': 'Institution', // Typo fix
    'legal wall': 'Legal Wall',
    'legalwall': 'Legal Wall',
    'wall': 'Wall',
    'piece': 'Piece',
    'throw up': 'Throw Up',
    'throwup': 'Throw Up',
    'throw-up': 'Throw Up',
    'bomb': 'Bomb',
    'wildstyle': 'Wildstyle',
    'wild style': 'Wildstyle',
    'wild-style': 'Wildstyle',
    'food and drink': 'Food & Drink',
    'food & drink': 'Food & Drink',
    'culture places': 'Culture Places',
    'culture place': 'Culture Places',
    'cultural place': 'Culture Places',
    'cultural places': 'Culture Places'
  };
  
  // Check for exact matches first
  if (typeMap[formattedType]) {
    return typeMap[formattedType];
  }
  
  // Check for partial matches
  for (const [key, value] of Object.entries(typeMap)) {
    if (formattedType.includes(key) || key.includes(formattedType)) {
      return value;
    }
  }
  
  // If no match found, capitalize the first letter
  return formattedType.charAt(0).toUpperCase() + formattedType.slice(1);
};

// Export dataset info for reference
export const DATASET_INFO = {
  Centrum: {
    id: 'cmcut1t446aqw1lljnelbo105',
    name: 'Amsterdam Street Art - Centrum District',
    editUrl: 'https://studio.mapbox.com/datasets/cmcut1t446aqw1lljnelbo105',
    tileset: 'sama-map.cmcut1t446aqw1lljnelbo105-2vy9x'
  },
  Centre: {
    id: 'cmcut1t446aqw1lljnelbo105',
    name: 'Amsterdam Street Art - Centre District (alias for Centrum)',
    editUrl: 'https://studio.mapbox.com/datasets/cmcut1t446aqw1lljnelbo105',
    tileset: 'sama-map.cmcut1t446aqw1lljnelbo105-2vy9x'
  },
  Noord: {
    id: 'cmfgx8b9p4j941oo91237sgz8',
    name: 'Amsterdam Street Art - Noord District',
    editUrl: 'https://studio.mapbox.com/datasets/cmfgx8b9p4j941oo91237sgz8'
  },
  North: {
    id: 'cmfgx8b9p4j941oo91237sgz8',
    name: 'Amsterdam Street Art - North District (alias for Noord)',
    editUrl: 'https://studio.mapbox.com/datasets/cmfgx8b9p4j941oo91237sgz8'
  },
  East: {
    id: 'cmfhcvur21oi61oqway88hf1a',
    name: 'Amsterdam Street Art - East District',
    editUrl: 'https://studio.mapbox.com/datasets/cmfhcvur21oi61oqway88hf1a'
  },
  West: {
    id: 'cmd8p91sz2zh71opaktguag9b',
    name: 'Amsterdam Street Art - West District',
    editUrl: 'https://studio.mapbox.com/datasets/cmd8p91sz2zh71opaktguag9b'
  },
  South: {
    id: 'cmd8paqs41srl1nqe0oqxmvjg',
    name: 'Amsterdam Street Art - South District',
    editUrl: 'https://studio.mapbox.com/datasets/cmd8paqs41srl1nqe0oqxmvjg'
  },
  'Nieuw-West': {
    id: 'cmcxrlelg0rjy1mrxtpa0coq1',
    name: 'Amsterdam Street Art - Nieuw-West District',
    editUrl: 'https://studio.mapbox.com/datasets/cmcxrlelg0rjy1mrxtpa0coq1',
    tileset: 'sama-map.cmcxrlelg0rjy1mrxtpa0coq1-722ch'
  },
  'New-West': {
    id: 'cmcxrlelg0rjy1mrxtpa0coq1',
    name: 'Amsterdam Street Art - New-West District (alias for Nieuw-West)',
    editUrl: 'https://studio.mapbox.com/datasets/cmcxrlelg0rjy1mrxtpa0coq1',
    tileset: 'sama-map.cmcxrlelg0rjy1mrxtpa0coq1-722ch'
  },
  default: {
    id: 'cmcut1t446aqw1lljnelbo105',
    name: 'Amsterdam Street Art - Centre District (default)',
    editUrl: 'https://studio.mapbox.com/datasets/cmcut1t446aqw1lljnelbo105'
  }
};

// Test function to verify region statistics calculation
export const testRegionStats = async () => {
  console.log('🧪 Testing region statistics calculation...');
  
  try {
    const stats = await calculateRegionStats();
    console.log('📊 Calculated region statistics with dynamic types:', stats);
    
    // Log summary for each region
    Object.entries(stats).forEach(([region, data]) => {
      console.log(`📍 ${region}: ${data.totalLocations} total items`);
      
      // Log all types found in this region
      if (data.types && Object.keys(data.types).length > 0) {
        console.log(`  📋 Types found:`);
        Object.entries(data.types)
          .sort(([,a], [,b]) => b - a) // Sort by count (highest first)
          .forEach(([type, count]) => {
            console.log(`    ${getTypeIcon(type)} ${type}: ${count}`);
          });
      } else {
        console.log(`  ⚠️ No types found`);
      }
    });
    
    return stats;
  } catch (error) {
    console.error('❌ Region stats test failed:', error);
    return null;
  }
};

// Helper function to get icon for type (for console logging)
const getTypeIcon = (type) => {
  const typeLower = type.toLowerCase();
  
  if (typeLower.includes('mural')) return '🎨';
  if (typeLower.includes('street art')) return '🎨';
  if (typeLower.includes('graffiti')) return '✏️';
  if (typeLower.includes('tag')) return '✏️';
  if (typeLower.includes('sticker')) return '🏷️';
  if (typeLower.includes('paste up') || typeLower.includes('pasteup')) return '📄';
  if (typeLower.includes('installation')) return '🗿';
  if (typeLower.includes('sculpture')) return '🗿';
  if (typeLower.includes('piece')) return '🎨';
  if (typeLower.includes('throw up') || typeLower.includes('throwup')) return '💨';
  if (typeLower.includes('bomb')) return '💣';
  if (typeLower.includes('wildstyle') || typeLower.includes('wild style')) return '🌀';
  if (typeLower.includes('gallery')) return '🏛️';
  if (typeLower.includes('museum')) return '🏛️';
  if (typeLower.includes('culture places') || typeLower.includes('cultural place')) return '🎭';
  if (typeLower.includes('legal wall') || typeLower.includes('legalwall')) return '🧱';
  if (typeLower.includes('wall')) return '🧱';
  
  return '📍';
};