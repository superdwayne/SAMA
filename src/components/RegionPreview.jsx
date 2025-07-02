import React from 'react';
import { useNavigate } from 'react-router-dom';
import './RegionPreview.css';

// Region data with stats matching the design
const regionStats = {
  'Center': {
    artworks: 25,
    galleries: 3,
    legalWalls: 2,
    featuredArtists: 15,
    image: '/images/collage.png'
  },
  'North': {
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
  }
};

const RegionPreview = ({ region, onClose }) => {
  const navigate = useNavigate();
  
  if (!region) return null;
  
  const regionName = region.title === 'Center' ? 'Center' : region.title;
  const stats = regionStats[regionName] || regionStats['Center'];
  const isUnlocked = region.isFree || false;
  
  const handleGetItNow = async () => {
    if (isUnlocked) {
      // For free regions, go to the region-specific map
      navigate(`/map?region=${region.title}`);
      return;
    }
    
    // For paid regions, go to payment page first
    navigate(`/payment/${region.id}`);
  };

  return (
    <div className="region-detail-container">
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
      <button className="region-back-btn" onClick={onClose} aria-label="Back">
        <span className="back-arrow">←</span>
      </button>
      
      {/* Main Content Overlay - Yellow Section */}
      <div className="region-content-overlay">
        <div className="tour-label">STREET ART TOUR:</div>
        <h1 className="region-name">{regionName}</h1>
        
        <div className="region-description-box">
          <p className="region-description" dangerouslySetInnerHTML={{ __html: region.description }} />
        </div>
        
        {/* Stats and Map Container - Single White Box */}
        <div className="stats-map-container">
          {/* Stats List */}
          <div className="stats-list">
            <div className="stat-item">
              <div className="stat-icon">🎨</div>
              <div className="stat-text">
                <span className="stat-number">{stats.artworks}</span>
                <span className="stat-label">Artworks</span>
              </div>
            </div>
            
            <div className="stat-item">
              <div className="stat-icon">🏛️</div>
              <div className="stat-text">
                <span className="stat-number">{stats.galleries}</span>
                <span className="stat-label">Galleries</span>
              </div>
            </div>
            
            <div className="stat-item">
              <div className="stat-icon">🎯</div>
              <div className="stat-text">
                <span className="stat-number">{stats.legalWalls}</span>
                <span className="stat-label">Legal Walls</span>
              </div>
            </div>
            
            <div className="stat-item">
              <div className="stat-icon">👥</div>
              <div className="stat-text">
                <span className="stat-number">{stats.featuredArtists}</span>
                <span className="stat-label">Featured Artists</span>
              </div>
            </div>
          </div>
          
          {/* Map Preview Circle */}
          <div className="map-preview-circle">
            <div className="map-preview-content">
              <div className="map-preview-text">Map Preview</div>
            </div>
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

export default RegionPreview;