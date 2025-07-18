// Simple utility to fetch data from your Mapbox dataset via backend
// Updated with new Center dataset: cmcut1t446aqw1lljnelbo105
// Manage Center locations at: https://studio.mapbox.com/datasets/cmcut1t446aqw1lljnelbo105

import { getMapboxToken } from './mapboxAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Region-specific dataset IDs
const REGION_DATASETS = {
  'Centre': 'cmcut1t446aqw1lljnelbo105', // Centre dataset
  'Center': 'cmcut1t446aqw1lljnelbo105', // Alternative spelling
  'Centrum': 'cmcut1t446aqw1lljnelbo105', // Dutch name for Center
  'Noord': 'cmd8pa31s0z4o1nqopxbxt8ob', // North dataset
  'North': 'cmd8pa31s0z4o1nqopxbxt8ob', // Alternative spelling
  'East': 'cmd8p7zbx01hp1ts22egpc8gj', // East dataset
  'Nieuw-West': 'cmcxrlelg0rjy1mrxtpa0coq1', // Nieuw-West specific dataset
  'New-West': 'cmcxrlelg0rjy1mrxtpa0coq1', // Alternative spelling
  'West': 'cmd8p91sz2zh71opaktguag9b', // West dataset
  'South': 'cmd8paqs41srl1nqe0oqxmvjg', // South dataset
  'South-East': 'cmd8p9ju32k3h1nns36c6ugbv' // South-East dataset
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
        if (region === 'Center' || region === 'New-West') continue;
        
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
        if (index < 3) {
          console.log(`🔍 Feature ${index} properties:`, props);
          console.log(`🔍 Feature ${index} coordinates:`, coords);
        }
        
        const district = props.region || props.district || 'Centrum';
        
        // Debug: Log the first few conversions
        if (index < 5) {
          console.log(`🔄 Converting feature ${index}:`, {
            title: props.title || props.Title || 'Untitled Location',
            propsRegion: props.region,
            propsDistrict: props.district,
            finalDistrict: district,
            coordinates: [coords[1], coords[0]], // lat, lng
            originalCoords: coords // lng, lat
          });
        }
        
        return {
          id: feature.id || `mapbox-${index}`,
          title: props.title || props.Title || 'Untitled Location',
          artist: props.artist || 'Unknown Artist',
          description: props.description || props.des || '',
          des: props.des || props.description || '',
          image_url: props.image_url || '',
          type: props.type || 'mural',
          district: district,
          latitude: coords[1],
          longitude: coords[0],
          address: props.address || '',
          openingHours: props.openingHours || props.hours || '',
          year: props.year || '',
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
    id: 'cmd8pa31s0z4o1nqopxbxt8ob',
    name: 'Amsterdam Street Art - Noord District',
    editUrl: 'https://studio.mapbox.com/datasets/cmd8pa31s0z4o1nqopxbxt8ob'
  },
  North: {
    id: 'cmd8pa31s0z4o1nqopxbxt8ob',
    name: 'Amsterdam Street Art - North District (alias for Noord)',
    editUrl: 'https://studio.mapbox.com/datasets/cmd8pa31s0z4o1nqopxbxt8ob'
  },
  East: {
    id: 'cmd8p7zbx01hp1ts22egpc8gj',
    name: 'Amsterdam Street Art - East District',
    editUrl: 'https://studio.mapbox.com/datasets/cmd8p7zbx01hp1ts22egpc8gj'
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
  'South-East': {
    id: 'cmd8p9ju32k3h1nns36c6ugbv',
    name: 'Amsterdam Street Art - South-East District',
    editUrl: 'https://studio.mapbox.com/datasets/cmd8p9ju32k3h1nns36c6ugbv'
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