// Quick Dataset Test
// Test this at: http://localhost:3000/quick-test

import React, { useState } from 'react';
import { testRegionStats } from '../utils/mapboxData';
import { getRegionStats, clearRegionStatsCache } from '../data/regions';
import './QuickTest.css';

const QuickTest = () => {
  const [status, setStatus] = useState('');
  const [locations, setLocations] = useState([]);
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const testDataset = async () => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    
    setStatus('Testing your dataset via direct Mapbox API...');
    
    try {
      // Test 1: Check if we can access Mapbox datasets directly
      const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
      if (!MAPBOX_TOKEN) {
        setStatus('❌ No Mapbox token found');
        return;
      }
      
      // Test 2: Get features directly from Mapbox
      const USERNAME = 'dwaynepaisley-marshall';
      const DATASET_ID = 'cmcut1t446aqw1lljnelbo105'; // Centre dataset
      
      const featuresResponse = await fetch(`https://api.mapbox.com/datasets/v1/${USERNAME}/${DATASET_ID}/features?access_token=${MAPBOX_TOKEN}`);
      
      if (!featuresResponse.ok) {
        setStatus(`❌ Can't read features from Mapbox: ${featuresResponse.status}`);
        return;
      }
      
      const features = await featuresResponse.json();
      setLocations(features.features);
      setStatus(`✅ Direct Mapbox API working! Found ${features.features.length} locations`);
      
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  const addTestLocation = async () => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    
    setStatus('Adding test location via direct Mapbox API...');
    
    try {
      const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
      if (!MAPBOX_TOKEN) {
        setStatus('❌ No Mapbox token found');
        return;
      }
      
      const testLocation = {
        title: 'Test Street Art',
        artist: 'Test Artist',
        description: 'This is a test location from React via direct Mapbox API',
        type: 'artwork',
        district: 'Centre',
        latitude: 52.3676,
        longitude: 4.9041
      };

      // Since the backend endpoint doesn't exist, we'll just log the location
      console.log('📍 Test location would be added:', testLocation);
      setStatus('✅ Test location logged (backend endpoint not implemented)');
      
      // Refresh the list
      testDataset();
      
    } catch (error) {
      setStatus(`❌ Error adding location: ${error.message}`);
    }
  };

  const runRegionStatsTest = async () => {
    setLoading(true);
    try {
      console.log('🧪 Running region stats test...');
      
      // Clear cache to force fresh data
      clearRegionStatsCache();
      
      // Test the raw calculation function
      const rawStats = await testRegionStats();
      
      // Test the cached getRegionStats function
      const cachedStats = await getRegionStats();
      
      setTestResults({
        rawStats,
        cachedStats,
        timestamp: new Date().toISOString()
      });
      
      console.log('✅ Region stats test completed');
    } catch (error) {
      console.error('❌ Region stats test failed:', error);
      setTestResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="quick-test">
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

      <div className="test-section">
        <h3>Region Statistics Test</h3>
        <button 
          onClick={runRegionStatsTest} 
          disabled={loading}
          className="test-button"
        >
          {loading ? 'Testing...' : 'Test Region Stats'}
        </button>
        
        {testResults && (
          <div className="test-results">
            <h4>Test Results ({testResults.timestamp})</h4>
            
            {testResults.error ? (
              <div className="error">❌ Error: {testResults.error}</div>
            ) : (
              <div>
                <h5>Raw Stats (from Mapbox):</h5>
                <pre>{JSON.stringify(testResults.rawStats, null, 2)}</pre>
                
                <h5>Cached Stats (from getRegionStats):</h5>
                <pre>{JSON.stringify(testResults.cachedStats, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ backgroundColor: '#fff3cd', padding: '15px', borderRadius: '5px', marginTop: '20px' }}>
        <h3>📖 Instructions:</h3>
        <ol>
          <li><strong>Test Dataset</strong> - Check if your dataset works</li>
          <li><strong>Add Test Location</strong> - Add a test pin to your dataset</li>
          <li><strong>Go to main map</strong> - Visit / to see if it appears</li>
        </ol>
        
        <p><strong>Centre Dataset ID:</strong> cmcut1t446aqw1lljnelbo105</p>
        <p><strong>North Dataset ID:</strong> cmfgx8b9p4j941oo91237sgz8</p>
        <p><strong>East Dataset ID:</strong> cmfhcvur21oi61oqway88hf1a</p>
        <p><strong>West Dataset ID:</strong> cmd8p91sz2zh71opaktguag9b</p>
        <p><strong>South Dataset ID:</strong> cmd8paqs41srl1nqe0oqxmvjg</p>
        <p><strong>Nieuw-West Dataset ID:</strong> cmcxrlelg0rjy1mrxtpa0coq1</p>
        <p><strong>Manage Centre at:</strong> <a href="https://studio.mapbox.com/datasets/cmcut1t446aqw1lljnelbo105" target="_blank">Mapbox Studio (Centre)</a></p>
        <p><strong>Manage North at:</strong> <a href="https://studio.mapbox.com/datasets/cmfgx8b9p4j941oo91237sgz8" target="_blank">Mapbox Studio (North)</a></p>
        <p><strong>Manage East at:</strong> <a href="https://studio.mapbox.com/datasets/cmfhcvur21oi61oqway88hf1a" target="_blank">Mapbox Studio (East)</a></p>
        <p><strong>Manage West at:</strong> <a href="https://studio.mapbox.com/datasets/cmd8p91sz2zh71opaktguag9b" target="_blank">Mapbox Studio (West)</a></p>
        <p><strong>Manage South at:</strong> <a href="https://studio.mapbox.com/datasets/cmd8paqs41srl1nqe0oqxmvjg" target="_blank">Mapbox Studio (South)</a></p>
        <p><strong>Manage Nieuw-West at:</strong> <a href="https://studio.mapbox.com/datasets/cmcxrlelg0rjy1mrxtpa0coq1" target="_blank">Mapbox Studio (Nieuw-West)</a></p>
      </div>
    </div>
  );
};

export default QuickTest;