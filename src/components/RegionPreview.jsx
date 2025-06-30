import React, { useMemo, useState } from 'react';
import Map, { Source, Layer, Popup } from 'react-map-gl';
import { useNavigate } from 'react-router-dom';
import EmailMagicLink from './EmailMagicLink';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [showMagicLinkModal, setShowMagicLinkModal] = useState(false);
  if (!region) return null;
  const regionName = region.title === 'South-East' ? 'South-East' : region.title === 'Nieuw-West' ? 'Nieuw-West' : region.title.charAt(0).toUpperCase() + region.title.slice(1);
  const center = regionCenters[regionName] || { latitude: 52.37, longitude: 4.89 };

  const handleGetItNow = async () => {
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
    const features = event.features || [];
    console.log('Clicked features:', features);
    // Find the first feature from the pins layer
    const pinFeature = features.find(f => f.layer && f.layer.id === 'nw-pins-layer');
    if (pinFeature) {
      setPopup({
        longitude: pinFeature.geometry.coordinates[0],
        latitude: pinFeature.geometry.coordinates[1],
        properties: pinFeature.properties,
      });
    } else {
      setPopup(null);
    }
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
      {/* Hamburger menu */}
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
        {popup && (
          <Popup
            longitude={popup.longitude}
            latitude={popup.latitude}
            closeButton={true}
            closeOnClick={true}
            onClose={() => setPopup(null)}
            anchor="bottom"
            maxWidth="260px"
          >
            <div>
              {/* Always show Artist field if present (case-insensitive) */}
              {(() => {
                const artist = popup.properties.artist || popup.properties.Artist;
                if (artist) {
                  return <div><strong>Artist:</strong> {artist}</div>;
                }
                return null;
              })()}
              {/* Show all properties */}
              {Object.entries(popup.properties).map(([key, value]) => (
                <div key={key}><strong>{key}:</strong> {String(value)}</div>
              ))}
            </div>
          </Popup>
        )}
      </Map>
      <div className="region-preview-card">
        <button className="region-preview-close" onClick={onClose}>×</button>
        <div className="region-preview-title">{region.title}</div>
        <div className="region-preview-desc">{region.description}</div>
        <div className="region-preview-locked">Locked</div>
        <button className="region-preview-get-btn" onClick={handleGetItNow}>Get it now</button>
      </div>
    </div>
  );
};

export default RegionPreview; 