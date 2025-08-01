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
    const shouldUse = typeLower === 'food & drink' || typeLower === 'food and drink' || typeLower === 'restaurant' || typeLower === 'cafe' || typeLower === 'dining';
    // console.log('🍽️ shouldUseRestaurantIcon:', { type, typeLower, shouldUse });
    return shouldUse;
  };

  // Format type label - map Mapbox values to standardized names
  const formatTypeLabel = (type) => {
    if (!type) return '';
    
    const typeLower = type.toLowerCase();
    
    // Map Mapbox values to standardized category names
    switch (typeLower) {
      case 'artwork':
      case 'mural':
      case 'sculpture':
      case 'graffiti':
        return 'Artworks';
        
      case 'souvenirs':
      case 'shopping':
      case 'shop':
        return 'Souvenirs';
        
      case 'food & drink':
      case 'food and drink':
      case 'restaurant':
      case 'cafe':
      case 'dining':
        return 'Food & Drink Spots';
        
      case 'gallery':
        return 'Galleries';
        
      case 'culture place':
      case 'culture places':
        return 'Culture Places';
        
      case 'institution':
      case 'instituion': // Typo fix
      case 'museum':
        return 'Institutions';
        
      case 'legal-wall':
      case 'brick-wall':
      case 'wall':
        return 'Legal Graffiti Wall';
        
      default:
        // For any unmapped types, just replace "AND" with "&" and capitalize
        return type.replace(/\bAND\b/g, '&').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  // Get icon based on type - using the same logic as Map.jsx
  const getTypeIcon = (type) => {
    // console.log('🔍 getTypeIcon called with type:', type);
    // console.log('🔍 shouldUseRestaurantIcon(type):', shouldUseRestaurantIcon(type));
    
    // Check for special icon components first
    if (shouldUseBrickWallIcon(type)) {
      return <BrickWallIcon size={24} />;
    }
    
    if (shouldUseShoppingBagIcon(type)) {
      return <ShoppingBagIcon size={20} />;
    }
    
    if (shouldUseRestaurantIcon(type)) {
      console.log('✅ Using RestaurantIcon for type:', type);
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
      // case 'food & drink': return '🍽️'; // Removed - handled by RestaurantIcon component
      case 'culture place': return '🎭';
      case 'culture places': return '🎭';
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
              <span className="stat-label">{formatTypeLabel(type)}</span>
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