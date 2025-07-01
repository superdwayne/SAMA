import React from 'react';
import './ArtworkPopup.css';

const ArtworkPopup = ({ artwork, onClose, onNavigate }) => {
  return (
    <>
      <div className="popup-back-btn-container">
        <button className="popup-back-btn" onClick={onClose} aria-label="Back">
          <span className="back-arrow">←</span>
        </button>
      </div>
      <div className="artwork-popup-bottom-sheet">
        <div className="artwork-image-placeholder">
          <img 
            src="/images/street-art-placeholder.jpg" 
            alt="Street Art"
            className="placeholder-image"
          />
        </div>
        <div className="popup-content-section">
          <div className="artist-label">{artwork.artist || 'Artist name'}</div>
          <h1 className="artwork-title">{artwork.title || 'WORK TITLE'}</h1>
          <p className="artwork-description">
            {artwork.description || 'This is a short text with information about this location.'}
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
