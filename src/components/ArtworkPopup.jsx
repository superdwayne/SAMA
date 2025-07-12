import React, { useState } from 'react';
import './ArtworkPopup.css';

const ArtworkPopup = ({ artwork, onClose, onNavigate }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Helper function to fix incomplete URLs
  const normalizeImageUrl = (url) => {
    if (!url) return null;
    
    // If URL already has protocol, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If URL starts with //, add https:
    if (url.startsWith('//')) {
      return `https:${url}`;
    }
    
    // Otherwise, add https:// prefix
    return `https://${url}`;
  };

  // Use image_url from Mapbox dataset, normalize URL, fallback to placeholder
  const normalizedImageUrl = normalizeImageUrl(artwork.image_url);
  const imageSource = normalizedImageUrl && !imageError 
    ? normalizedImageUrl 
    : '/images/street-art-placeholder.jpg';

  // Debug: Log image URL to help troubleshoot
  console.log('🖼️ Artwork image debug:', {
    title: artwork.title,
    original_image_url: artwork.image_url,
    normalized_image_url: normalizedImageUrl,
    imageSource,
    imageError,
    imageLoading
  });

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
          <span className="back-arrow">
            <img src="/images/back.png" alt="Back" className="back-arrow-img" />
          </span>
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
        <div className="popup-content-scrollable">
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
      </div>
    </>
  );
};

export default ArtworkPopup;
