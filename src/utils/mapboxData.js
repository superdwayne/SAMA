// Simple utility to fetch data from your Mapbox dataset via backend
// Updated with new Center dataset: cmcut1t446aqw1lljnelbo105
// Manage Center locations at: https://studio.mapbox.com/datasets/cmcut1t446aqw1lljnelbo105

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Region-specific dataset IDs
const REGION_DATASETS = {
  'Centre': 'cmcut1t446aqw1lljnelbo105', // New Center dataset
  'Center': 'cmcut1t446aqw1lljnelbo105', // Alternative spelling
  'Centrum': 'cmcut1t446aqw1lljnelbo105', // Dutch name for Center
  'Noord': 'cmcqcjc7f0nm71no2kwuyzgdb', // Default dataset for other regions
  'North': 'cmcqcjc7f0nm71no2kwuyzgdb',
  'East': 'cmcqcjc7f0nm71no2kwuyzgdb',
  'Nieuw-West': 'cmcqcjc7f0nm71no2kwuyzgdb',
  'West': 'cmcqcjc7f0nm71no2kwuyzgdb',
  'South': 'cmcqcjc7f0nm71no2kwuyzgdb',
  'South-East': 'cmcqcjc7f0nm71no2kwuyzgdb'
};

// Fetch all street art locations from your Mapbox dataset directly from Mapbox API
export const fetchMapboxDataset = async (specificRegion = null) => {
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
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
        // Skip duplicates (Center/Centre use same dataset)
        if (region === 'Center' || region === 'North') continue;
        
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

// Export dataset info for reference
export const DATASET_INFO = {
  Centrum: {
    id: 'cmcut1t446aqw1lljnelbo105',
    name: 'Amsterdam Street Art - Centrum District',
    editUrl: 'https://studio.mapbox.com/datasets/cmcut1t446aqw1lljnelbo105',
    title: 'sama-map.cmcut1t446aqw1lljnelbo105-2vy9x'
  },
  Centre: {
    id: 'cmcut1t446aqw1lljnelbo105',
    name: 'Amsterdam Street Art - Centre District (alias for Centrum)',
    editUrl: 'https://studio.mapbox.com/datasets/cmcut1t446aqw1lljnelbo105',
    title: 'sama-map.cmcut1t446aqw1lljnelbo105-2vy9x'
  },
  default: {
    id: 'cmcqcjc7f0nm71no2kwuyzgdb',
    name: 'Amsterdam Street Art Locations (Other Regions)',
    editUrl: 'https://studio.mapbox.com/datasets/cmcqcjc7f0nm71no2kwuyzgdb'
  }
};