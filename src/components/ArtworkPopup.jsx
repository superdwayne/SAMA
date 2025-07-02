import React, { useState } from 'react';
import './ArtworkPopup.css';

const ArtworkPopup = ({ artwork, onClose, onNavigate }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Use image_url from Mapbox dataset, fallback to placeholder
  const imageSource = artwork.image_url && !imageError 
    ? artwork.image_url 
    : '/images/street-art-placeholder.jpg';

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  return (
    <>
      <div className="popup-back-btn-container">
        <button className="popup-back-btn" onClick={onClose} aria-label="Back">
          <span className="back-arrow">←</span>
        </button>
      </div>
      <div className="artwork-popup-bottom-sheet">
        <div className="artwork-image-placeholder">
          {imageLoading && artwork.image_url && (
            <div className="image-loading">
              <div className="loading-spinner"></div>
            </div>
          )}
          <img 
            src={imageSource}
            alt={artwork.title || 'Street Art'}
            className="placeholder-image"
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{ display: imageLoading ? 'none' : 'block' }}
          />
        </div>
        <div className="popup-content-section">
          <div className="artist-label">{artwork.artist || artwork.Artist || 'Artist name'}</div>
          <h1 className="artwork-title">{artwork.title || artwork.Title || 'WORK TITLE'}</h1>
          <p className="artwork-description">
            {artwork.des || artwork.description || 'This is a short text with information about this location.'}
          </p>
          <button className="navigate-btn" onClick={() => onNavigate(artwork)}>
            Navigate Here
          </button>
          <div className="artwork-details">
            {artwork.year && (
              <div className="detail-item">
                <span className="detail-label">Year:</span> {artwork.year}
              </div>
            )}
            {artwork.address && (
              <div className="detail-item">
                <span className="detail-label">Location:</span> {artwork.address}
              </div>
            )}
            {artwork.openingHours && (
              <div className="detail-item">
                <span className="detail-label">Hours:</span> {artwork.openingHours}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ArtworkPopup;
