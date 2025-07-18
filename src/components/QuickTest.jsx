// Quick Dataset Test
// Test this at: http://localhost:3000/quick-test

import React, { useState } from 'react';

const QuickTest = () => {
  const [status, setStatus] = useState('');
  const [locations, setLocations] = useState([]);

  const testDataset = async () => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    
    setStatus('Testing your dataset via backend...');
    
    try {
      // Test 1: Check dataset exists via backend
      const datasetResponse = await fetch(`${API_URL}/mapbox/test`);
      
      if (!datasetResponse.ok) {
        setStatus(`❌ Backend error: ${datasetResponse.status}`);
        return;
      }
      
      const datasetResult = await datasetResponse.json();
      setStatus(`✅ Dataset "${datasetResult.dataset.name}" works via backend!`);
      
      // Test 2: Get features via backend
      const featuresResponse = await fetch(`${API_URL}/mapbox/locations`);
      
      if (!featuresResponse.ok) {
        setStatus(`❌ Can't read features via backend: ${featuresResponse.status}`);
        return;
      }
      
      const features = await featuresResponse.json();
      setLocations(features.features);
      setStatus(`✅ Backend working! Found ${features.features.length} locations`);
      
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  const addTestLocation = async () => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    
    setStatus('Adding test location via backend...');
    
    try {
      const testLocation = {
        title: 'Test Street Art',
        artist: 'Test Artist',
        description: 'This is a test location from React via backend',
        type: 'artwork',
        district: 'Centre',
        latitude: 52.3676,
        longitude: 4.9041
      };

      const response = await fetch(`${API_URL}/mapbox/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testLocation)
      });

      if (response.ok) {
        setStatus('✅ Test location added via backend! Refresh to see it.');
        testDataset(); // Refresh the list
      } else {
        setStatus(`❌ Failed to add location via backend: ${response.status}`);
      }
    } catch (error) {
      setStatus(`❌ Error adding location: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>🧪 Quick Dataset Test (via Backend)</h1>
      
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '15px', 
        borderRadius: '5px', 
        marginBottom: '20px',
        fontFamily: 'monospace'
      }}>
        <strong>Status:</strong> {status || 'Ready to test'}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={testDataset}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px' 
          }}
        >
          🧪 Test Dataset
        </button>
        
        <button 
          onClick={addTestLocation}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px' 
          }}
        >
          ➕ Add Test Location
        </button>
      </div>

      {locations.length > 0 && (
        <div style={{ backgroundColor: '#e3f2fd', padding: '15px', borderRadius: '5px' }}>
          <h3>📍 Locations in Dataset ({locations.length}):</h3>
          {locations.map((feature, index) => (
            <div key={index} style={{ 
              backgroundColor: 'white', 
              padding: '10px', 
              margin: '10px 0', 
              borderRadius: '5px' 
            }}>
              <strong>{feature.properties.title || 'Untitled'}</strong>
              <br />
              <small>
                Artist: {feature.properties.artist || 'Unknown'} | 
                Type: {feature.properties.type || 'unknown'} | 
                District: {feature.properties.district || 'unknown'}
              </small>
              {feature.properties.description && (
                <>
                  <br />
                  <small style={{ color: '#666' }}>{feature.properties.description}</small>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ backgroundColor: '#fff3cd', padding: '15px', borderRadius: '5px', marginTop: '20px' }}>
        <h3>📖 Instructions:</h3>
        <ol>
          <li><strong>Test Dataset</strong> - Check if your dataset works</li>
          <li><strong>Add Test Location</strong> - Add a test pin to your dataset</li>
          <li><strong>Go to main map</strong> - Visit / to see if it appears</li>
        </ol>
        
        <p><strong>Centre Dataset ID:</strong> cmcut1t446aqw1lljnelbo105</p>
        <p><strong>North Dataset ID:</strong> cmd8pa31s0z4o1nqopxbxt8ob</p>
        <p><strong>East Dataset ID:</strong> cmd8p7zbx01hp1ts22egpc8gj</p>
        <p><strong>West Dataset ID:</strong> cmd8p91sz2zh71opaktguag9b</p>
        <p><strong>South Dataset ID:</strong> cmd8paqs41srl1nqe0oqxmvjg</p>
        <p><strong>South-East Dataset ID:</strong> cmd8p9ju32k3h1nns36c6ugbv</p>
        <p><strong>Nieuw-West Dataset ID:</strong> cmcxrlelg0rjy1mrxtpa0coq1</p>
        <p><strong>Manage Centre at:</strong> <a href="https://studio.mapbox.com/datasets/cmcut1t446aqw1lljnelbo105" target="_blank">Mapbox Studio (Centre)</a></p>
        <p><strong>Manage North at:</strong> <a href="https://studio.mapbox.com/datasets/cmd8pa31s0z4o1nqopxbxt8ob" target="_blank">Mapbox Studio (North)</a></p>
        <p><strong>Manage East at:</strong> <a href="https://studio.mapbox.com/datasets/cmd8p7zbx01hp1ts22egpc8gj" target="_blank">Mapbox Studio (East)</a></p>
        <p><strong>Manage West at:</strong> <a href="https://studio.mapbox.com/datasets/cmd8p91sz2zh71opaktguag9b" target="_blank">Mapbox Studio (West)</a></p>
        <p><strong>Manage South at:</strong> <a href="https://studio.mapbox.com/datasets/cmd8paqs41srl1nqe0oqxmvjg" target="_blank">Mapbox Studio (South)</a></p>
        <p><strong>Manage South-East at:</strong> <a href="https://studio.mapbox.com/datasets/cmd8p9ju32k3h1nns36c6ugbv" target="_blank">Mapbox Studio (South-East)</a></p>
        <p><strong>Manage Nieuw-West at:</strong> <a href="https://studio.mapbox.com/datasets/cmcxrlelg0rjy1mrxtpa0coq1" target="_blank">Mapbox Studio (Nieuw-West)</a></p>
      </div>
    </div>
  );
};

export default QuickTest;