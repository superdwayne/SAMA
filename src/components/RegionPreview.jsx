import React, { useMemo, useState, useRef } from 'react';
import Map, { Source, Layer, Popup, Marker } from 'react-map-gl';
import { useNavigate } from 'react-router-dom';
import EmailMagicLink from './EmailMagicLink';
import ArtworkPopup from './ArtworkPopup';
import { streetArtLocations } from '../data/locations';
import './RegionPreview.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const allRegionsFillLayer = {
  id: 'all-regions-fill',
  type: 'fill',
  source: 'sama-map-regions',
  'source-layer': 'tilebox_grenzen-8u5o1t',
  paint: {
    'fill-color': '#b39ddb', // lighter purple
    'fill-opacity': 0.18,
  },
};
const allRegionsOutlineLayer = {
  id: 'all-regions-outline',
  type: 'line',
  source: 'sama-map-regions',
  'source-layer': 'tilebox_grenzen-8u5o1t',
  paint: {
    'line-color': '#b39ddb',
    'line-width': 2,
  },
};
const regionFillLayer = (regionName) => ({
  id: 'region-preview-fill',
  type: 'fill',
  source: 'sama-map-regions',
  'source-layer': 'tilebox_grenzen-8u5o1t',
  filter: ['==', ['get', 'name'], regionName],
  paint: {
    'fill-color': '#8e44ad',
    'fill-opacity': 0.38,
  },
});
const regionOutlineLayer = (regionName) => ({
  id: 'region-preview-outline',
  type: 'line',
  source: 'sama-map-regions',
  'source-layer': 'tilebox_grenzen-8u5o1t',
  filter: ['==', ['get', 'name'], regionName],
  paint: {
    'line-color': '#8e44ad',
    'line-width': 4,
  },
});
const pinsLayer = {
  id: 'nw-pins-layer',
  type: 'circle',
  source: 'nw-pins',
  'source-layer': 'NW-Pins',
  paint: {
    'circle-radius': 7,
    'circle-color': '#e74c3c',
    'circle-stroke-width': 2,
    'circle-stroke-color': '#fff',
  },
};

const regionCenters = {
  'Centre': { latitude: 52.3728, longitude: 4.8936 },
  'North': { latitude: 52.4000, longitude: 4.9000 },
  'South': { latitude: 52.3500, longitude: 4.8800 },
  'East': { latitude: 52.3600, longitude: 4.9400 },
  'West': { latitude: 52.3800, longitude: 4.8500 },
  'South-East': { latitude: 52.3200, longitude: 4.9700 },
  'Nieuw-West': { latitude: 52.3700, longitude: 4.8100 },
};

const RegionPreview = ({ region, onClose }) => {
  const navigate = useNavigate();
  const mapRef = useRef();
  const [popup, setPopup] = useState(null);
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showMagicLinkModal, setShowMagicLinkModal] = useState(false);
  const [routeGeoJson, setRouteGeoJson] = useState(null);
  const [routeSteps, setRouteSteps] = useState(null);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [userLocation, setUserLocation] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [isFetchingRoute, setIsFetchingRoute] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [tourStartMode, setTourStartMode] = useState(null); // 'user', 'pin', or 'single'
  
  if (!region) return null;
  
  const regionName = region.title === 'South-East' ? 'South-East' : region.title === 'Nieuw-West' ? 'Nieuw-West' : region.title.charAt(0).toUpperCase() + region.title.slice(1);
  const center = regionCenters[regionName] || { latitude: 52.37, longitude: 4.89 };
  const isUnlocked = region.isFree || false; // Check if region is free
  
  const handleGetItNow = async () => {
    // If region is free, go to map with region parameter
    if (isUnlocked) {
      // Disabled: navigate(`/map?region=${region.id}`);
      return;
    }
    
    // Go directly to Stripe, bypassing the payment page
    
    // Use hardcoded Stripe payment link for Centre region
    if (regionName === 'Centre') {
      window.location.href = 'https://buy.stripe.com/5kQ8wQ4nF7GM1irgZx1oI01';
      return;
    }
    
    // For other regions, create checkout session and redirect to Stripe
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ region: region.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      
      // Redirect directly to Stripe Checkout
      window.location.href = url;

    } catch (error) {
      console.error('Payment error:', error);
      // Fallback to payment page if API fails
      navigate(`/payment/${region.id}`);
    }
  };

  const handleMapClick = (event) => {
    console.log('Map clicked', { isUnlocked, event });
    const features = event.features || [];
    const pinFeature = features.find(f => f.layer && f.layer.id === 'nw-pins-layer');
    if (pinFeature) {
      const longitude = pinFeature.geometry.coordinates[0];
      const latitude = pinFeature.geometry.coordinates[1];
      setSelectedArtwork({
        ...pinFeature.properties,
        longitude,
        latitude,
        isPin: true
      });
      setPopup(null);
      return;
    }
    setPopup(null);
    setSelectedArtwork(null);
  };

  const handleArtworkClick = (artwork) => {
    setSelectedArtwork(artwork);
    setPopup(null);
  };

  // Log all pin features and their properties when the map loads the pins source
  const handlePinsSourceData = (e) => {
    if (e && e.dataType === 'source' && e.sourceId === 'nw-pins' && e.isSourceLoaded) {
      const map = e.target;
      const features = map.querySourceFeatures('nw-pins', { sourceLayer: 'NW-Pins' });
      console.log('Loaded pins from Mapbox:', features.map(f => f.properties));
    }
  };

  const handleShowMagicLink = () => {
    setMenuOpen(false);
    setShowMagicLinkModal(true);
  };

  // Maneuver icon mapping
  const maneuverIcons = {
    'turn': {
      left: '⬅️',
      right: '➡️',
      straight: '⬆️',
      uturn: '↩️'
    },
    'depart': '🚶',
    'arrive': '🏁',
    'roundabout': '🌀',
    'merge': '🔀',
    'fork': '��',
    'end of road': '⛔',
    'continue': '⬆️'
  };
  function getManeuverIcon(step) {
    if (step.maneuver.type === 'turn') {
      return maneuverIcons.turn[step.maneuver.modifier] || '➡️';
    }
    return maneuverIcons[step.maneuver.type] || '➡️';
  }

  // Helper to chunk pins for Directions API
  function chunkPins(pins, chunkSize) {
    const chunks = [];
    for (let i = 0; i < pins.length; i += chunkSize) {
      chunks.push(pins.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // Helper: distance between two [lng, lat] points in meters
  function getDistance(a, b) {
    const toRad = x => x * Math.PI / 180;
    const R = 6371000;
    const dLat = toRad(b[1] - a[1]);
    const dLng = toRad(b[0] - a[0]);
    const lat1 = toRad(a[1]);
    const lat2 = toRad(b[1]);
    const aVal = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.sin(dLng/2) * Math.sin(dLng/2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1-aVal));
    return R * c;
  }

  // Start/stop geolocation watch always (not just when route is active)
  React.useEffect(() => {
    const id = navigator.geolocation.watchPosition(
      pos => {
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
      },
      err => {
        console.error('Live geolocation error:', err);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );
    setWatchId(id);
    return () => {
      navigator.geolocation.clearWatch(id);
      setWatchId(null);
      setUserLocation(null);
      setCurrentStepIdx(0);
    };
  }, []);

  // 3D building layer
  const buildingLayer = {
    id: '3d-buildings',
    source: 'composite',
    'source-layer': 'building',
    filter: ['==', 'extrude', 'true'],
    type: 'fill-extrusion',
    minzoom: 15,
    paint: {
      'fill-extrusion-color': '#aaa',
      'fill-extrusion-height': [
        'interpolate',
        ['linear'],
        ['zoom'],
        15,
        0,
        15.05,
        ['get', 'height']
      ],
      'fill-extrusion-base': [
        'interpolate',
        ['linear'],
        ['zoom'],
        15,
        0,
        15.05,
        ['get', 'min_height']
      ],
      'fill-extrusion-opacity': 0.6
    }
  };

  return (
    <div className="region-preview-overlay">
      {/* Back arrow at top left */}
      <button className="region-preview-back-btn" onClick={onClose} aria-label="Back">
        ←
      </button>
      {/* Hamburger menu at top right */}
      <div className="region-preview-menu-btn" onClick={() => setMenuOpen(m => !m)}>
        <span className="menu-bar" />
        <span className="menu-bar" />
        <span className="menu-bar" />
      </div>
      {menuOpen && (
        <div className="region-preview-menu-dropdown">
          <button className="region-preview-menu-item" onClick={handleShowMagicLink}>
            📧 Get Magic Link
          </button>
        </div>
      )}
      {showMagicLinkModal && (
        <EmailMagicLink onClose={() => setShowMagicLinkModal(false)} />
      )}
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          latitude: center.latitude,
          longitude: center.longitude,
          zoom: 13
        }}
        style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0 }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        attributionControl={false}
        interactiveLayerIds={['nw-pins-layer']}
        onClick={handleMapClick}
        onSourceData={handlePinsSourceData}
      >
        <Source
          id="sama-map-regions"
          type="vector"
          url="mapbox://sama-map.3bcb314w"
        >
          <Layer {...allRegionsFillLayer} />
          <Layer {...allRegionsOutlineLayer} />
          <Layer {...regionFillLayer(regionName)} />
          <Layer {...regionOutlineLayer(regionName)} />
        </Source>
        <Source
          id="nw-pins"
          type="vector"
          url="mapbox://sama-map.cmcdau2ox10ct1npijaxk0i7m-9z3su"
        >
          <Layer {...pinsLayer} />
        </Source>
        {/* 3D buildings layer */}
        <Layer {...buildingLayer} />
        {routeGeoJson && (
          <Source id="route" type="geojson" data={routeGeoJson}>
            <Layer
              id="route-line"
              type="line"
              paint={{
                'line-color': '#1976d2',
                'line-width': 5
              }}
            />
          </Source>
        )}
        {userLocation && (
          <Marker longitude={userLocation.longitude} latitude={userLocation.latitude} anchor="center">
            <div style={{width: 22, height: 22, background: '#1976d2', borderRadius: '50%', border: '3px solid #fff', boxShadow: '0 2px 8px rgba(25,118,210,0.18)'}}></div>
          </Marker>
        )}
      </Map>
      <div className="region-preview-card">
        {console.log('selectedArtwork:', selectedArtwork)}
        <button className="region-preview-close" onClick={() => setSelectedArtwork(null) || onClose}>×</button>
        {selectedArtwork ? (
          <>
            <div className="region-preview-title">Artwork</div>
            {(() => {
              const artistKey = Object.keys(selectedArtwork || {}).find(
                k => k.trim().toLowerCase() === 'artist'
              );
              const artistValue = artistKey ? selectedArtwork[artistKey] : null;
              console.log('selectedArtwork keys:', Object.keys(selectedArtwork));
              console.log('artistValue:', artistValue);
              return artistValue ? (
                <div className="region-preview-desc"><strong>Artist:</strong> {artistValue}</div>
              ) : null;
            })()}
            {/* Button group for actions */}
            <div className="region-preview-btn-group">
              <button
                className="region-preview-get-btn direction-btn"
                disabled={isFetchingRoute}
                onClick={() => { setTourStartMode('user'); setShowLocationPrompt(true); }}
              >
                {isFetchingRoute ? 'Loading...' : 'Start tour from my location'}
              </button>
              <button
                className="region-preview-get-btn direction-btn"
                disabled={isFetchingRoute}
                onClick={() => { setTourStartMode('pin'); setShowLocationPrompt(true); }}
              >
                {isFetchingRoute ? 'Loading...' : 'Start tour from this artwork'}
              </button>
              <button
                className="region-preview-get-btn direction-btn"
                disabled={isFetchingRoute}
                onClick={() => { setTourStartMode('single'); setShowLocationPrompt(true); }}
              >
                {isFetchingRoute ? 'Loading...' : 'Route to this artwork'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="region-preview-title">{region.title}</div>
            <div className="region-preview-desc">{region.description}</div>
            <div className={`region-preview-status ${isUnlocked ? 'unlocked' : 'locked'}`}>{isUnlocked ? 'Free Access' : 'Locked'}</div>
            <button className="region-preview-get-btn" onClick={handleGetItNow}>
              {isUnlocked ? 'Explore now' : 'Get it now'}
            </button>
          </>
        )}
      </div>
      {/* Location permission modal */}
      {showLocationPrompt && (
        <div className="location-modal-overlay">
          <div className="location-modal">
            <h3>Allow Location Access</h3>
            <p>To start your art tour, we need your location to create a route from your current position.</p>
            <div style={{ display: 'flex', gap: '16px', marginTop: '18px', justifyContent: 'center' }}>
              <button
                className="region-preview-get-btn direction-btn"
                onClick={async () => {
                  setShowLocationPrompt(false);
                  setIsFetchingRoute(true);
                  setRouteGeoJson(null);
                  setRouteSteps(null);
                  const map = mapRef.current && mapRef.current.getMap();
                  let regionPins = [];
                  if (map) {
                    const features = map.querySourceFeatures('nw-pins', { sourceLayer: 'NW-Pins' });
                    regionPins = features
                      .filter(f => (f.properties.Region || '').toLowerCase() === regionName.toLowerCase())
                      .map(f => f.geometry.coordinates);
                  }
                  // Split pins into chunks of 24
                  const MAX_WAYPOINTS = 24;
                  const pinChunks = chunkPins(regionPins, MAX_WAYPOINTS);
                  let allCoords = [];
                  let currentOrigin = [selectedArtwork.longitude, selectedArtwork.latitude];
                  let fullRouteCoords = [];
                  let allSteps = [];
                  for (let i = 0; i < pinChunks.length; i++) {
                    const chunk = pinChunks[i];
                    const coords = [currentOrigin, ...chunk];
                    const coordsStr = coords.map(c => c.join(",")).join(";");
                    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coordsStr}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
                    console.log(`Routing segment ${i+1} with ${chunk.length} pins`);
                    console.log('Directions API URL:', url);
                    const response = await fetch(url);
                    const data = await response.json();
                    if (data.routes && data.routes[0]) {
                      // Append coordinates (skip first if not first segment to avoid duplicate)
                      const segCoords = data.routes[0].geometry.coordinates;
                      if (i > 0) segCoords.shift();
                      fullRouteCoords = fullRouteCoords.concat(segCoords);
                      // Append steps
                      if (data.routes[0].legs && data.routes[0].legs[0] && data.routes[0].legs[0].steps) {
                        allSteps = allSteps.concat(data.routes[0].legs[0].steps);
                      }
                      // Set next origin as last pin in this chunk
                      currentOrigin = chunk[chunk.length - 1];
                    } else {
                      alert('No route found for segment ' + (i+1));
                      setIsFetchingRoute(false);
                      return;
                    }
                  }
                  setRouteGeoJson({
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates: fullRouteCoords },
                    properties: {}
                  });
                  setRouteSteps(allSteps);
                }}
              >
                Allow
              </button>
              <button
                className="region-preview-get-btn back-btn"
                onClick={() => setShowLocationPrompt(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {routeSteps && (
        <div className="directions-steps">
          {console.log('routeSteps:', routeSteps)}
          <h4 style={{margin: '18px 0 10px 0', fontWeight: 700}}>Directions</h4>
          <ol style={{paddingLeft: 24, fontSize: '1.05rem'}}>
            {routeSteps.map((step, idx) => (
              <li key={idx} style={{marginBottom: 8, display: 'flex', alignItems: 'center', background: idx === currentStepIdx ? '#e3f2fd' : 'transparent', borderRadius: 6, padding: idx === currentStepIdx ? '4px 8px' : 0}}>
                <span style={{marginRight: 10, fontSize: '1.2em'}}>{getManeuverIcon(step)}</span>
                <span style={{fontWeight: idx === currentStepIdx ? 700 : 400}}>{step.maneuver.instruction}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

export default RegionPreview; 