import React, { useMemo, useState } from 'react';
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
  const [popup, setPopup] = useState(null);
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showMagicLinkModal, setShowMagicLinkModal] = useState(false);
  const [routeGeoJson, setRouteGeoJson] = useState(null);
  const [isFetchingRoute, setIsFetchingRoute] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  
  if (!region) return null;
  
  const regionName = region.title === 'South-East' ? 'South-East' : region.title === 'Nieuw-West' ? 'Nieuw-West' : region.title.charAt(0).toUpperCase() + region.title.slice(1);
  const center = regionCenters[regionName] || { latitude: 52.37, longitude: 4.89 };
  const isUnlocked = region.isFree || false; // Check if region is free
  
  const handleGetItNow = async () => {
    // If region is free, go to map with region parameter
    if (isUnlocked) {
      navigate(`/map?region=${region.id}`);
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
              {selectedArtwork.latitude && selectedArtwork.longitude && (
                <button
                  className="region-preview-get-btn direction-btn"
                  disabled={isFetchingRoute}
                  onClick={() => setShowLocationPrompt(true)}
                >
                  {isFetchingRoute ? 'Loading...' : 'Get Directions'}
                </button>
              )}
              <button className="region-preview-get-btn back-btn" onClick={() => setSelectedArtwork(null)}>
                Back to region
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
                  if (!navigator.geolocation) {
                    alert('Geolocation is not supported by your browser');
                    setIsFetchingRoute(false);
                    return;
                  }
                  navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                      try {
                        const userLat = pos.coords.latitude;
                        const userLng = pos.coords.longitude;
                        const origin = [userLng, userLat];
                        // Gather all pins in the region (in order)
                        const regionPins = streetArtLocations
                          .filter(a => a.district === regionName)
                          .map(a => [a.longitude, a.latitude]);
                        if (regionPins.length === 0) {
                          alert('No pins found for this region.');
                          setIsFetchingRoute(false);
                          return;
                        }
                        // Build coordinates string: origin;pin1;pin2;...;lastPin
                        const allCoords = [origin, ...regionPins];
                        const coordsStr = allCoords.map(c => c.join(",")).join(";");
                        const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coordsStr}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
                        const response = await fetch(url);
                        const data = await response.json();
                        if (data.routes && data.routes[0]) {
                          setRouteGeoJson({
                            type: 'Feature',
                            geometry: data.routes[0].geometry,
                            properties: {}
                          });
                        } else {
                          alert('No route found.');
                        }
                      } catch (err) {
                        alert('Could not fetch directions.');
                      }
                      setIsFetchingRoute(false);
                    },
                    (err) => {
                      console.error('Geolocation error:', err);
                      let message = 'Could not get your location.';
                      if (err.code === 1) message = 'Location permission denied. Please allow location access in your browser.';
                      else if (err.code === 2) message = 'Location unavailable. Try moving to an area with better signal or check your device settings.';
                      else if (err.code === 3) message = 'Location request timed out. Try again.';
                      alert(message);
                      setIsFetchingRoute(false);
                    }
                  );
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
    </div>
  );
};

export default RegionPreview; 