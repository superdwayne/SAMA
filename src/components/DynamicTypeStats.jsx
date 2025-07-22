import React from 'react';
import BrickWallIcon from './BrickWallIcon';
import ShoppingBagIcon from './ShoppingBagIcon';
import RestaurantIcon from './RestaurantIcon';
import './DynamicTypeStats.css';

const DynamicTypeStats = ({ stats, loading, error }) => {
  // Helper functions from Map.jsx
  const shouldUseBrickWallIcon = (type) => {
    const typeLower = type?.toLowerCase();
    const shouldUse = typeLower === 'brick-wall' || typeLower === 'wall' || typeLower === 'legal-wall';
    return shouldUse;
  };

  const shouldUseShoppingBagIcon = (type) => {
    const typeLower = type?.toLowerCase();
    const shouldUse = typeLower === 'shopping' || typeLower === 'shop' || typeLower === 'souvenirs';
    return shouldUse;
  };

  const shouldUseRestaurantIcon = (type) => {
    const typeLower = type?.toLowerCase();
    const shouldUse = typeLower === 'food & drink' || typeLower === 'restaurant' || typeLower === 'cafe' || typeLower === 'dining';
    return shouldUse;
  };

  // Get icon based on type - using the same logic as Map.jsx
  const getTypeIcon = (type) => {
    // Check for special icon components first
    if (shouldUseBrickWallIcon(type)) {
      return <BrickWallIcon size={24} />;
    }
    
    if (shouldUseShoppingBagIcon(type)) {
      return <ShoppingBagIcon size={20} />;
    }
    
    if (shouldUseRestaurantIcon(type)) {
      return <RestaurantIcon size={22} />;
    }
    
    // Use emoji icons for other types (same as Map.jsx getMarkerIcon function)
    switch(type?.toLowerCase()) {
      // Local data types
      case 'museum': return '🏛️';
      case 'artwork': return '📍';
      case 'legal-wall': return '🧱';
      case 'gallery': return '🖼️';
      
      // Mapbox dataset types (capitalized)
      case 'souvenirs': return '🛍️';
      case 'shopping': return '🛍️';
      case 'food & drink': return '🍽️';
      case 'culture place': return '🎭';
      case 'institution': return '🏛️';
      case 'instituion': return '🏛️';  // Typo fix
      
      // Legacy/additional types
      case 'mural': return '📍';
      case 'sculpture': return '🗿';
      case 'graffiti': return '✨';
      case 'shop': return '🛍️';
      case 'studio': return '🏠';
      case 'wall': return '🧱';
      case 'brick-wall': return '🧱';
      
      default: return '📍'; // Default to art icon
    }
  };

  if (loading) {
    return (
      <div className="stats-map-flex">
        <div className="stat-flex-item">
          <div className="stat-row">
            <div className="stat-item">
              <span className="stat-icon">⏳</span>
              <span className="stat-number">...</span>
              <span className="stat-label">Loading</span>
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
    );
  }

  if (error) {
    return (
      <div className="stats-map-flex">
        <div className="stat-flex-item">
          <div className="stat-row">
            <div className="stat-item">
              <span className="stat-icon">❌</span>
              <span className="stat-number">0</span>
              <span className="stat-label">Error loading data</span>
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
    );
  }

  if (!stats || !stats.types || Object.keys(stats.types).length === 0) {
    return (
      <div className="stats-map-flex">
        <div className="stat-flex-item">
          <div className="stat-row">
            <div className="stat-item">
              
              <span className="stat-label" style={{margin: '0px auto'}}>Coming soon</span>
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
    );
  }

  // Sort types by count and get top 3
  const sortedTypes = Object.entries(stats.types)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);

  return (
    <div className="stats-map-flex">
      <div className="stat-flex-item">
        <div className="stat-row">
          {sortedTypes.map(([type, count]) => (
            <div key={type} className="stat-item">
              <span className="stat-icon">
                {getTypeIcon(type)}
              </span>
              <span className="stat-number">{count}</span>
              <span className="stat-label">{type}</span>
            </div>
          ))}
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
  );
};

export default DynamicTypeStats; 