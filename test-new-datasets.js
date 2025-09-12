// Test script to verify all new dataset IDs are working
// Run with: node test-new-datasets.js

const MAPBOX_TOKEN = process.env.VITE_MAPBOX_TOKEN || process.env.MAPBOX_TOKEN;
const USERNAME = 'sama-map';

const NEW_DATASETS = {
  'East': 'cmd8p7zbx01hp1ts22egpc8gj',
  'West': 'cmd8p91sz2zh71opaktguag9b', 
  'South-East': 'cmd8p9ju32k3h1nns36c6ugbv',
  'North': 'sama-map.cmd8pa31s0z4o1nqopxbxt8ob-1jlpk',
  'South': 'cmd8paqs41srl1nqe0oqxmvjg'
};

async function testDataset(datasetId, regionName) {
  try {
    console.log(`🧪 Testing ${regionName} dataset: ${datasetId}`);
    
    const response = await fetch(`https://api.mapbox.com/datasets/v1/${USERNAME}/${datasetId}/features?access_token=${MAPBOX_TOKEN}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${regionName}: Valid dataset with ${data.features.length} features`);
      return { valid: true, featureCount: data.features.length };
    } else {
      console.log(`❌ ${regionName}: Invalid dataset (Status: ${response.status})`);
      return { valid: false, status: response.status };
    }
  } catch (error) {
    console.log(`❌ ${regionName}: Error testing dataset - ${error.message}`);
    return { valid: false, error: error.message };
  }
}

async function testAllDatasets() {
  console.log('🔍 Testing all new dataset IDs...\n');
  
  if (!MAPBOX_TOKEN) {
    console.error('❌ No Mapbox token found! Set VITE_MAPBOX_TOKEN or MAPBOX_TOKEN environment variable.');
    return;
  }
  
  const results = {};
  
  for (const [region, datasetId] of Object.entries(NEW_DATASETS)) {
    const result = await testDataset(datasetId, region);
    results[region] = result;
    console.log(''); // Add spacing between tests
  }
  
  console.log('📊 Summary:');
  console.log('===========');
  
  let validCount = 0;
  let totalCount = Object.keys(NEW_DATASETS).length;
  
  for (const [region, result] of Object.entries(results)) {
    if (result.valid) {
      console.log(`✅ ${region}: ${result.featureCount} features`);
      validCount++;
    } else {
      console.log(`❌ ${region}: Failed`);
    }
  }
  
  console.log(`\n🎯 ${validCount}/${totalCount} datasets are valid`);
  
  if (validCount === totalCount) {
    console.log('🎉 All new datasets are ready to use!');
  } else {
    console.log('⚠️ Some datasets may need to be created or configured.');
  }
}

// Run the test
testAllDatasets().catch(console.error); 