import React, { useEffect } from 'react';
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
    image: '/images/collage.png'
  },
  'East': {
    artworks: 22,
    galleries: 1,
    legalWalls: 3,
    featuredArtists: 18,
   image: '/images/collage.png'
  },
  'Nieuw-West': {
    artworks: 15,
    galleries: 1,
    legalWalls: 3,
    featuredArtists: 8,
   image: '/images/collage.png'
  }
};

const RegionDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  // Find the region by ID
  const region = regions.find(r => r.id === id);
  
  // Helper function to render region description with custom styling
  const renderRegionDescription = (region) => {
    if (region.id === 'centre') {
      return (
        <div>
          <span className="region-description-ultrabold">Tourists, tags & tension.</span>
          <br />
          <span className="region-description-regular">The city's loudest gallery</span>
        </div>
      );
    }
    
    // For other regions, render with HTML
    return <span dangerouslySetInnerHTML={{ __html: region.description }} />;
  };
  
  // Enable scrolling for this page - Minimal Safe Version
  useEffect(() => {
    console.log('RegionDetailPage mounted, region ID:', id);
    console.log('Region found:', region?.title || 'NOT FOUND');
    
    // Add classes for CSS styling
    document.body.classList.add('region-detail-page');
    const root = document.getElementById('root');
    if (root) {
      root.classList.add('region-detail-container');
    }
    
    // Minimal style override - let CSS handle most of it
    const body = document.body;
    if (body && window.innerWidth <= 768) {
      body.style.position = 'static';
      body.style.overflow = 'auto';
      if (root) {
        root.style.position = 'static';
        root.style.overflow = 'auto';
      }
    }
    
    // Cleanup
    return () => {
      document.body.classList.remove('region-detail-page');
      if (root) {
        root.classList.remove('region-detail-container');
      }
      // Let CSS reset handle the rest
    };
  }, [id, region]);
  
  // Better error handling - don't redirect immediately
  if (!region) {
    console.error('Region not found:', id);
    console.log('Available regions:', regions.map(r => r.id));
    
    // Show error state instead of immediate redirect
    return (
      <div className="region-detail-page">
        <div className="region-content-overlay" style={{ marginTop: '20vh', minHeight: '60vh' }}>
          <h1>Region not found</h1>
          <p>The region "{id}" was not found.</p>
          <button onClick={() => navigate('/')} className="get-it-now-btn">
            Go back to home
          </button>
        </div>
      </div>
    );
  }
  
  const regionName = region.title;
  const stats = regionStats[regionName] || regionStats['Centre'];
  
  const handleGetItNow = async () => {
    // Direct Stripe links for each region
    const stripeLinks = {
      'centre': 'https://buy.stripe.com/5kQ8wQ4nF7GM1irgZx1oI01',
      'noord': 'https://buy.stripe.com/00w00k4nF8KQgdlgZx1oI03',
      'east': 'https://buy.stripe.com/cNi8wQbQ70ekgdl38H1oI04',
      'nieuw-west': 'https://buy.stripe.com/3cI4gA4nF3qw6CL9x51oI06'
    };

    const stripeUrl = stripeLinks[region.id];
    
    if (stripeUrl) {
      console.log('🔗 Redirecting directly to Stripe for', region.title, '→', stripeUrl);
      window.location.href = stripeUrl;
    } else {
      console.error('❌ No Stripe link found for region:', region.id);
      // Fallback to payment page if no direct link
      navigate(`/payment/${region.id}`);
    }
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
          <p className="region-description">{renderRegionDescription(region)}</p>
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

        <div className="payment-section">
          <div className="price-section">
            <div className="lock-icon">
              <img src="/images/unlockdis.png" alt="Locked" className="unlock-icon-img" />
            </div>
            <div className="price-large">€4,99</div>
            <div className="price-subtitle">One-time payment</div>
            <div className="price-description">
              Lifetime access to all<br/>
              content in this district
            </div>
            <button className="get-it-now-btn" onClick={handleGetItNow}>
        Unlock District
        </button>
          </div>
          
        </div>
        
        {/* Action Button */}
       
      </div>
    </div>
  );
};

export default RegionDetailPage;