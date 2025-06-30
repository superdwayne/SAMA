import React from 'react';
import './ArtworkPopup.css';

const ArtworkPopup = ({ artwork }) => {
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
      {artwork.image && (
        <img 
          src={artwork.image} 
          alt={artwork.title}
          className="artwork-image"
        />
      )}
      
      <div className="artwork-content">
        <span className={`artwork-type ${artwork.type}`}>
          {getTypeLabel(artwork.type)}
        </span>
        
        <h3>{artwork.title}</h3>
        
        {artwork.artist && (
          <p className="artwork-artist">by {artwork.artist}</p>
        )}
        
        <p className="artwork-description">{artwork.description}</p>
        
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
    </div>
  );
};

export default ArtworkPopup;