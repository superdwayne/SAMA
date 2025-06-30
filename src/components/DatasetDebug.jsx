// Quick Dataset Troubleshooter
// Save as: /src/components/DatasetDebug.jsx

import React, { useState } from 'react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const DATASET_ID = 'cmc35wyju1dgt1ms3u19ozf6e';

const DatasetDebug = () => {
  const [status, setStatus] = useState('');
  const [datasets, setDatasets] = useState([]);

  // Test 1: Check if token works at all
  const testToken = async () => {
    setStatus('Testing token...');
    try {
      const response = await fetch(`https://api.mapbox.com/tokens/v2?access_token=${MAPBOX_TOKEN}`);
      if (response.ok) {
        const data = await response.json();
        setStatus(`✅ Token works! Account: ${data.usage || 'Valid'}`);
        return true;
      } else {
        setStatus(`❌ Token invalid: ${response.status}`);
        return false;
      }
    } catch (error) {
      setStatus(`❌ Token test failed: ${error.message}`);
      return false;
    }
  };

  // Test 2: List all datasets to see what exists
  const listDatasets = async () => {
    setStatus('Listing your datasets...');
    try {
      const response = await fetch(`https://api.mapbox.com/datasets/v1?access_token=${MAPBOX_TOKEN}`);
      if (response.ok) {
        const data = await response.json();
        setDatasets(data);
        setStatus(`✅ Found ${data.length} datasets`);
        
        // Log the dataset IDs to console for easy copying
        console.log('🗂️ Your dataset IDs:');
        data.forEach(dataset => {
          console.log(`📂 "${dataset.name || 'Unnamed'}" → ID: ${dataset.id}`);
        });
      } else {
        setStatus(`❌ Can't list datasets: ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      setStatus(`❌ Error listing datasets: ${error.message}`);
    }
  };

  // Test 3: Create a new dataset if needed
  const createDataset = async () => {
    setStatus('Creating new dataset...');
    try {
      const response = await fetch(`https://api.mapbox.com/datasets/v1?access_token=${MAPBOX_TOKEN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Amsterdam Street Art Locations',
          description: 'Street art, galleries, and legal walls in Amsterdam'
        })
      });
      
      if (response.ok) {
        const dataset = await response.json();
        setStatus(`✅ Created dataset! ID: ${dataset.id}`);
        console.log('🎉 NEW DATASET CREATED!');
        console.log('📋 Copy this ID:', dataset.id);
        console.log('🔧 Update your code with this ID');
        
        // Show in the UI too
        alert(`New dataset created!\n\nDataset ID: ${dataset.id}\n\nCopy this ID and update your code!`);
        
        return dataset.id;
      } else {
        const error = await response.text();
        setStatus(`❌ Failed to create dataset: ${response.status} - ${error}`);
      }
    } catch (error) {
      setStatus(`❌ Error creating dataset: ${error.message}`);
    }
  };

  // Test 4: Test specific dataset
  const testDataset = async (datasetId) => {
    setStatus(`Testing dataset ${datasetId}...`);
    try {
      const response = await fetch(`https://api.mapbox.com/datasets/v1/${datasetId}?access_token=${MAPBOX_TOKEN}`);
      if (response.ok) {
        const dataset = await response.json();
        setStatus(`✅ Dataset exists: "${dataset.name}"`);
        
        // Also check features
        const featuresResponse = await fetch(`https://api.mapbox.com/datasets/v1/${datasetId}/features?access_token=${MAPBOX_TOKEN}`);
        if (featuresResponse.ok) {
          const features = await featuresResponse.json();
          setStatus(`✅ Dataset "${dataset.name}" has ${features.features.length} locations`);
        }
      } else {
        setStatus(`❌ Dataset ${datasetId} not found: ${response.status}`);
      }
    } catch (error) {
      setStatus(`❌ Error testing dataset: ${error.message}`);
    }
  };

  // Add a sample location to test dataset
  const addSampleLocation = async (datasetId) => {
    setStatus('Adding sample location...');
    try {
      const sampleFeature = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [4.9041, 52.3676] // Amsterdam center
        },
        properties: {
          title: 'Test Street Art',
          artist: 'Test Artist',
          description: 'This is a test location',
          type: 'artwork',
          district: 'Centre'
        }
      };

      const response = await fetch(
        `https://api.mapbox.com/datasets/v1/${datasetId}/features?access_token=${MAPBOX_TOKEN}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sampleFeature)
        }
      );

      if (response.ok) {
        const result = await response.json();
        setStatus(`✅ Added sample location! Feature ID: ${result.id}`);
      } else {
        setStatus(`❌ Failed to add location: ${response.status}`);
      }
    } catch (error) {
      setStatus(`❌ Error adding location: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🔧 Mapbox Dataset Troubleshooter</h1>
      
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '15px', 
        borderRadius: '5px', 
        marginBottom: '20px',
        fontFamily: 'monospace'
      }}>
        <strong>Current Status:</strong> {status || 'Ready to test'}
      </div>

      <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
        <button onClick={testToken} style={{ padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>
          1️⃣ Test Token
        </button>
        
        <button onClick={listDatasets} style={{ padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px' }}>
          2️⃣ List My Datasets
        </button>
        
        <button onClick={() => testDataset(DATASET_ID)} style={{ padding: '10px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '5px' }}>
          3️⃣ Test Target Dataset ({DATASET_ID})
        </button>
        
        <button onClick={createDataset} style={{ padding: '10px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '5px' }}>
          4️⃣ Create New Dataset
        </button>
      </div>

      {/* Show existing datasets */}
      {datasets.length > 0 && (
        <div style={{ backgroundColor: '#e3f2fd', padding: '15px', borderRadius: '5px', marginTop: '20px' }}>
          <h3>📊 Your Existing Datasets:</h3>
          {datasets.map(dataset => (
            <div key={dataset.id} style={{ 
              backgroundColor: 'white', 
              padding: '10px', 
              margin: '10px 0', 
              borderRadius: '5px',
              border: dataset.id === DATASET_ID ? '2px solid #007bff' : '1px solid #ddd'
            }}>
              <strong>{dataset.name || 'Unnamed Dataset'}</strong>
              <br />
              <small>ID: {dataset.id}</small>
              <br />
              <small>Created: {new Date(dataset.created).toLocaleDateString()}</small>
              <br />
              <button 
                onClick={() => testDataset(dataset.id)}
                style={{ marginTop: '5px', padding: '5px 10px', fontSize: '12px' }}
              >
                Test This Dataset
              </button>
              <button 
                onClick={() => addSampleLocation(dataset.id)}
                style={{ marginTop: '5px', marginLeft: '5px', padding: '5px 10px', fontSize: '12px' }}
              >
                Add Sample Location
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ backgroundColor: '#fff3cd', padding: '15px', borderRadius: '5px', marginTop: '20px' }}>
        <h3>🔍 Debugging Steps:</h3>
        <ol>
          <li><strong>Test Token</strong> - Make sure your Mapbox token works</li>
          <li><strong>List Datasets</strong> - See what datasets exist in your account</li>
          <li><strong>Test Target Dataset</strong> - Check if the specific dataset ID exists</li>
          <li><strong>Create New Dataset</strong> - If needed, create a fresh dataset</li>
        </ol>
        
        <h4>🎯 Quick Fixes:</h4>
        <ul>
          <li>If token fails → Get new token from <a href="https://account.mapbox.com/access-tokens/" target="_blank">Mapbox Account</a></li>
          <li>If dataset doesn't exist → Create a new one and update the ID in your code</li>
          <li>If permissions fail → Make sure token has dataset read/write access</li>
        </ul>
      </div>
    </div>
  );
};

export default DatasetDebug;