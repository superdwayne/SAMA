// Simple utility to fetch data from your Mapbox dataset via backend
// Dataset ID: cmc36v4j505jd1nn170guhizs
// Manage locations at: https://studio.mapbox.com/datasets/cmc36v4j505jd1nn170guhizs

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Fetch all street art locations from your Mapbox dataset directly from Mapbox API
export const fetchMapboxDataset = async () => {
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
  const DATASET_ID = 'cmcdau2ox10ct1npijaxk0i7m';
  const USERNAME = 'sama-map';
  try {
    console.log('🔄 Fetching locations directly from Mapbox dataset...');
    const response = await fetch(`https://api.mapbox.com/datasets/v1/${USERNAME}/${DATASET_ID}/features?access_token=${MAPBOX_TOKEN}`);
    if (!response.ok) {
      throw new Error(`Mapbox API error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log(`📍 Found ${data.features.length} locations in Mapbox dataset`);
    // Convert Mapbox GeoJSON features to your app's format
    const locations = data.features.map((feature, index) => {
      const coords = feature.geometry.coordinates;
      const props = feature.properties;
      return {
        id: feature.id || `mapbox-${index}`,
        title: props.title || props.name || 'Untitled Location',
        artist: props.artist || props.Artist || 'Unknown Artist',
        description: props.description || '',
        type: props.type || 'artwork',
        district: props.district || props.Region || 'Centre',
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
export const addLocationToDataset = async (locationData) => {
  try {
    const response = await fetch(`${API_URL}/mapbox/locations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(locationData)
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
  id: 'cmcdau2ox10ct1npijaxk0i7m',
  name: 'Amsterdam Street Art Locations',
  editUrl: `https://studio.mapbox.com/datasets/cmc36v4j505jd1nn170guhizs`,
  description: 'Manage your street art locations at: https://studio.mapbox.com/datasets/'
};