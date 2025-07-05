import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './RegionDetailPage.css';

// Region data with stats matching the design
const regions = [
  { 
    id: 'centre', 
    title: 'Centre', 
    description: 'Tourists, tags & tension. </br> The city\'s loudest gallery', 
    latitude: 52.3728, 
    longitude: 4.8936, 
    isFree: false,
    image: '/images/center.png'
  },
  { 
    id: 'noord', 
    title: 'Noord', 
    description: 'From shipyards to street art. Noord is culture unleashed', 
    latitude: 52.4000, 
    longitude: 4.9000, 
    isFree: false,
    image: '/images/center.png'
  },
  { 
    id: 'east', 
    title: 'East', 
    description: 'East is hip, hungry and covered in color', 
    latitude: 52.3600, 
    longitude: 4.9400, 
    isFree: false,
    image: '/images/center.png' 
  },
  { 
    id: 'nieuw-west', 
    title: 'Nieuw-West', 
    description: 'Emerging street art destination with fresh perspectives', 
    latitude: 52.3700, 
    longitude: 4.8100, 
    isFree: false,
    image: '/images/center.png' 
  },
];

const regionStats = {
  'Centre': {
    artworks: 25,
    galleries: 3,
    legalWalls: 2,
    featuredArtists: 15,
    image: '/images/collage.png'
  },
  'Noord': {
    artworks: 18,
    galleries: 2,
    legalWalls: 1,
    featuredArtists: 12,
    image: '/north-street-art.jpg'
  },
  'East': {
    artworks: 22,
    galleries: 1,
    legalWalls: 3,
    featuredArtists: 18,
    image: '/east-street-art.jpg'
  },
  'Nieuw-West': {
    artworks: 15,
    galleries: 1,
    legalWalls: 3,
    featuredArtists: 8,
    image: '/nieuw-west-street-art.jpg'
  }
};

const RegionDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  // Find the region by ID
  const region = regions.find(r => r.id === id);
  
  if (!region) {
    // Redirect to home if region not found
    navigate('/');
    return null;
  }
  
  const regionName = region.title;
  const stats = regionStats[regionName] || regionStats['Centre'];
  
  const handleGetItNow = async () => {
    // For paid regions, go to payment page
    navigate(`/payment/${region.id}`);
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="region-detail-page">
      {/* Background Street Art Image */}
      <div className="region-background-image">
        {/* Placeholder pattern that looks like street art */}
        <div className="background-placeholder">
          <div className="placeholder-pattern"></div>
        </div>
        {stats.image ? (
          <img 
            src={stats.image} 
            alt={`${regionName} street art`}
            className="background-img"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : null}
      </div>
      
      {/* Back Button */}
      <button className="region-back-btn" onClick={handleBack} aria-label="Back">
        <span className="back-arrow">
          <img src="/images/back.png" alt="Back" className="back-arrow-img" />
        </span>
      </button>
      
      {/* Main Content Overlay - Yellow Section */}
      <div className="region-content-overlay">
        <div className="tour-label">STREET ART TOUR:</div>
        <h1 className="region-name">{regionName}</h1>
        
        <div className="region-description-box">
          <p className="region-description" dangerouslySetInnerHTML={{ __html: region.description }} />
        </div>
        
        {/* Stats and Map Container - Horizontal Layout */}
        <div className="stats-map-flex">
          <div className="stat-flex-item">
            <div className="stat-row">
              <div className="stat-item">
                <span className="stat-icon">📍</span>
                <span className="stat-number">{stats.artworks}</span>
                <span className="stat-label">Artworks</span>
              </div>
              <div className="stat-item">
                <span className="stat-icon">🏛️</span>
                <span className="stat-number">{stats.galleries}</span>
                <span className="stat-label">Galleries</span>
              </div>
              <div className="stat-item">
                <span className="stat-icon">🎨</span>
                <span className="stat-number">{stats.legalWalls}</span>
                <span className="stat-label">Legal Walls</span>
              </div>
            </div>
          </div>
          <div className="map-flex-item">
            <img
              src="/images/map.png"
              alt="Map preview"
              className="map-preview-img"
            />
          </div>
        </div>
        
        {/* Action Button */}
        <button className="get-it-now-btn" onClick={handleGetItNow}>
          Get it now
        </button>
      </div>
    </div>
  );
};

export default RegionDetailPage;