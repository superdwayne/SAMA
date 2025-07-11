// Simple utility to fetch data from your Mapbox dataset via backend
// Updated with new Center dataset: cmcut1t446aqw1lljnelbo105
// Manage Center locations at: https://studio.mapbox.com/datasets/cmcut1t446aqw1lljnelbo105

import { getMapboxToken } from './mapboxAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Region-specific dataset IDs
const REGION_DATASETS = {
  'Centre': 'cmcut1t446aqw1lljnelbo105', // New Center dataset
  'Center': 'cmcut1t446aqw1lljnelbo105', // Alternative spelling
  'Centrum': 'cmcut1t446aqw1lljnelbo105', // Dutch name for Center
  'Noord': 'cmcut1t446aqw1lljnelbo105', // TEMP: Using Centre dataset until proper dataset is created
  'North': 'cmcut1t446aqw1lljnelbo105', // TEMP: Using Centre dataset until proper dataset is created
  'East': 'cmcut1t446aqw1lljnelbo105', // TEMP: Using Centre dataset until proper dataset is created
  'Nieuw-West': 'cmcxrlelg0rjy1mrxtpa0coq1', // New Nieuw-West specific dataset
  'New-West': 'cmcxrlelg0rjy1mrxtpa0coq1', // Alternative spelling
  'West': 'cmcut1t446aqw1lljnelbo105', // TEMP: Using Centre dataset until proper dataset is created
  'South': 'cmcut1t446aqw1lljnelbo105', // TEMP: Using Centre dataset until proper dataset is created
  'South-East': 'cmcut1t446aqw1lljnelbo105' // TEMP: Using Centre dataset until proper dataset is created
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
        // Skip duplicates (Center/Centre and New-West/Nieuw-West use same datasets)
        if (region === 'Center' || region === 'North' || region === 'New-West') continue;
        
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
    const response = await fetch(`${API_URL}/mapbox/test`);
    
    if (!response.ok) {
      throw new Error(`Backend API error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Dataset connection successful via backend:', result.dataset?.name);
    return { success: true, dataset: result.dataset };
  } catch (error) {
    console.error('❌ Dataset connection failed:', error);
    return { success: false, error: error.message };
  }
};

// Add location to dataset via backend
export const addLocationToDataset = async (locationData, targetRegion = 'Centre') => {
  try {
    const datasetId = REGION_DATASETS[targetRegion] || REGION_DATASETS['Centre'];
    console.log(`📍 Adding location to ${targetRegion} dataset: ${datasetId}`);
    
    const response = await fetch(`${API_URL}/mapbox/locations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...locationData,
        datasetId: datasetId,
        region: targetRegion
      })
    });
    
    if (!response.ok) {
      throw new Error(`Backend API error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Location added via backend:', result.id);
    return result;
  } catch (error) {
    console.error('❌ Error adding location:', error);
    throw error;
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
    id: 'cmcqcjc7f0nm71no2kwuyzgdb',
    name: 'Amsterdam Street Art Locations (Other Regions)',
    editUrl: 'https://studio.mapbox.com/datasets/cmcqcjc7f0nm71no2kwuyzgdb'
  }
};