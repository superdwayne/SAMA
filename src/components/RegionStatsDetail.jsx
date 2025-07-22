import React, { useState } from 'react';
import BrickWallIcon from './BrickWallIcon';
import './RegionStatsDetail.css';

const RegionStatsDetail = ({ stats, loading, error }) => {
  const [expandedCategory, setExpandedCategory] = useState(null);

  const toggleCategory = (category) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'artworks':
        return '📍';
      case 'galleries':
        return '🏛️';
      case 'legalWalls':
        return <BrickWallIcon size={16} />;
      default:
        return '📌';
    }
  };

  const getCategoryTitle = (category) => {
    switch (category) {
      case 'artworks':
        return 'Artworks';
      case 'galleries':
        return 'Galleries';
      case 'legalWalls':
        return 'Legal Walls';
      default:
        return category;
    }
  };

  const getItemIcon = (item) => {
    const type = item.type?.toLowerCase() || '';
    if (type.includes('mural')) return '🎨';
    if (type.includes('sticker')) return '🏷️';
    if (type.includes('paste')) return '📄';
    if (type.includes('tag')) return '✏️';
    if (type.includes('installation')) return '🗿';
    if (type.includes('gallery')) return '🏛️';
    if (type.includes('museum')) return '🏛️';
    if (type.includes('legal')) return '✅';
    if (type.includes('wall')) return '🧱';
    return '📍';
  };

  if (loading) {
    return (
      <div className="region-stats-detail">
        <div className="stats-loading">
          <div className="loading-spinner"></div>
          <p>Loading region details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="region-stats-detail">
        <div className="stats-error">
          <p>⚠️ Unable to load region details</p>
          <small>{error}</small>
        </div>
      </div>
    );
  }

  const categories = [
    { key: 'artworks', items: stats.artworkItems || [] },
    { key: 'galleries', items: stats.galleryItems || [] },
    { key: 'legalWalls', items: stats.legalWallItems || [] }
  ];

  return (
    <div className="region-stats-detail">
      <div className="stats-summary">
        {categories.map(category => (
          <div key={category.key} className="stat-category">
            <div 
              className="category-header"
              onClick={() => toggleCategory(category.key)}
            >
              <span className="category-icon">{getCategoryIcon(category.key)}</span>
              <span className="category-count">{category.items.length}</span>
              <span className="category-title">{getCategoryTitle(category.key)}</span>
              <span className="expand-icon">
                {expandedCategory === category.key ? '▼' : '▶'}
              </span>
            </div>
            
            {expandedCategory === category.key && category.items.length > 0 && (
              <div className="category-items">
                {category.items.map((item, index) => (
                  <div key={index} className="item-row">
                    <span className="item-icon">{getItemIcon(item)}</span>
                    <div className="item-details">
                      <span className="item-name">{item.name}</span>
                      {item.artist && item.artist !== 'Unknown Artist' && (
                        <span className="item-artist">by {item.artist}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {expandedCategory === category.key && category.items.length === 0 && (
              <div className="no-items">
                <p>No {getCategoryTitle(category.key).toLowerCase()} found in this region</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RegionStatsDetail; 