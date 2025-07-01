import React from 'react';
import './ArtworkPopup.css';

const ArtworkPopup = ({ artwork, onClose, onNavigate }) => {
  const getTypeLabel = (type) => {
    switch(type) {
      case 'gallery': return 'Gallery';
      case 'legal-wall': return 'Legal Wall';
      case 'artwork': return 'Street Art';
      case 'museum': return 'Museum';
      default: return 'Point of Interest';
    }
  };

  return (
    <div className="artwork-popup">
      <div className="artwork-popup-header">
        {artwork.image ? (
          <img 
            src={artwork.image} 
            alt={artwork.title}
            className="artwork-image"
          />
        ) : (
          <div className="artwork-image-placeholder">
            🎨
          </div>
        )}
        
        {onClose && (
          <button className="popup-close-btn" onClick={onClose}>
            ×
          </button>
        )}
      </div>
      
      <div className="artwork-content">
        <span className="artwork-type">
          {getTypeLabel(artwork.type)}
        </span>
        
        <h1 className="artwork-title">{artwork.title}</h1>
        
        {artwork.artist && (
          <p className="artwork-subtitle">by {artwork.artist}</p>
        )}
        
        {artwork.description && (
          <p className="artwork-description">{artwork.description}</p>
        )}
        
        {(artwork.year || artwork.address || artwork.openingHours) && (
          <div className="artwork-meta">
            {artwork.year && (
              <p className="artwork-year">Created: {artwork.year}</p>
            )}
            
            {artwork.address && (
              <p className="artwork-address">📍 {artwork.address}</p>
            )}
            
            {artwork.openingHours && (
              <p className="artwork-hours">🕐 {artwork.openingHours}</p>
            )}
          </div>
        )}
        
        <div className="popup-buttons">
          <button 
            className="navigate-button primary" 
            onClick={onNavigate}
            disabled={!onNavigate}
          >
            🗺️ Get Directions
          </button>
          
          <button className="navigate-button secondary" onClick={onClose}>
            ← Back to region
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArtworkPopup;