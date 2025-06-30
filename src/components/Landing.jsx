import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import RegionPreview from './RegionPreview';
import { amsterdamRegions } from '../data/regions';
import './Landing.css';

// Example region data (replace with real data as needed)
const regions = [
  { id: 'centre', title: 'Centre', description: 'Historic heart of Amsterdam', latitude: 52.3728, longitude: 4.8936 },
  { id: 'north', title: 'North', description: 'Street art capital with massive murals', latitude: 52.4000, longitude: 4.9000 },
  { id: 'south', title: 'South', description: 'Upscale street art and museums', latitude: 52.3500, longitude: 4.8800 },
  { id: 'east', title: 'East', description: 'Multicultural district with diverse art', latitude: 52.3600, longitude: 4.9400 },
  { id: 'west', title: 'West', description: 'Industrial heritage and urban art', latitude: 52.3800, longitude: 4.8500 },
  { id: 'south-east', title: 'South-East', description: 'Vibrant murals and culture', latitude: 52.3200, longitude: 4.9700 },
  { id: 'nieuw-west', title: 'Nieuw-West', description: 'Emerging street art destination', latitude: 52.3700, longitude: 4.8100 },
];

function getRegionFeature(region) {
  // Map region id/title to amsterdamRegions feature
  const nameMap = {
    'centre': 'Centre',
    'north': 'North',
    'south': 'South',
    'east': 'East',
    'west': 'West',
    'south-east': 'South-East',
    'nieuw-west': 'Nieuw-West',
  };
  const regionName = nameMap[region.id];
  return amsterdamRegions.features.find(f => f.properties.name === regionName);
}

const Landing = () => {
  const [previewRegion, setPreviewRegion] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [regionFeature, setRegionFeature] = useState(null);

  const handleGetItNow = (region) => {
    setPreviewRegion(region);
    setRegionFeature(getRegionFeature(region));
    navigate(`/region/${region.id}`);
  };

  const handleClosePreview = () => {
    setPreviewRegion(null);
    setRegionFeature(null);
    navigate('/');
  };

  React.useEffect(() => {
    // Open modal if URL is /region/:id
    const match = location.pathname.match(/^\/region\/([\w-]+)/);
    if (match) {
      const region = regions.find(r => r.id === match[1]);
      if (region) {
        setPreviewRegion(region);
        setRegionFeature(getRegionFeature(region));
      }
    } else {
      setPreviewRegion(null);
      setRegionFeature(null);
    }
  }, [location.pathname]);

  return (
    <div className="landing-mobile-container">
      <header className="landing-mobile-header">
        <img src="/sama-logo-black.svg" alt="SAMA Logo" className="landing-mobile-logo" />
      </header>
      <div className="landing-mobile-card-list">
        {regions.map(region => (
          <div className="landing-mobile-card" key={region.id}>
            <div className="landing-mobile-card-image">
              {/* Placeholder image with X */}
              <svg width="100%" height="100%" viewBox="0 0 300 120">
                <rect width="300" height="120" fill="#ccc" />
                <line x1="0" y1="0" x2="300" y2="120" stroke="#aaa" strokeWidth="2" />
                <line x1="300" y1="0" x2="0" y2="120" stroke="#aaa" strokeWidth="2" />
              </svg>
            </div>
            <div className="landing-mobile-card-content">
              <div className="landing-mobile-card-title">{region.title}</div>
              <div className="landing-mobile-card-subtitle">{region.description}</div>
            </div>
            <button className="landing-mobile-get-btn" onClick={() => handleGetItNow(region)}>Get it now</button>
          </div>
        ))}
      </div>
      {previewRegion && regionFeature && (
        <RegionPreview region={previewRegion} regionFeature={regionFeature} onClose={handleClosePreview} />
      )}
    </div>
  );
};

export default Landing;
