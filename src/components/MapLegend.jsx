import React from 'react';
import QRCode from 'qrcode.react';
import './MapLegend.css';

const MapLegend = ({ baseUrl = 'https://amsterdamstreetart.vercel.app' }) => {
  return (
    <div className="street-art-legend">
     
      
      <div className="legend-content">
        

        <div className="sama-logo">
          <img src="/sama-logo-black.svg" alt="SAMA Logo" />
        </div>

        <div className="legend-main-title">
          <h1 className="routes-title">7 STREET<br />ART ROUTES</h1>
        </div>
        <div className="legend-icons">
          <div className="icon-legend">
            <div className="icon-item">
              <span className="icon">🏛️</span>
              <span className="icon-label">Street Art Institution</span>
            </div>
            <div className="icon-item">
              <span className="icon">📍</span>
              <span className="icon-label">Legal Graffiti Spot</span>
            </div>
            <div className="icon-item">
              <span className="icon">🖼️</span>
              <span className="icon-label">Gallery</span>
            </div>
            <div className="icon-item">
              <span className="icon">🎨</span>
              <span className="icon-label">Artist</span>
            </div>
            <div className="icon-item">
              <span className="icon">📚</span>
              <span className="icon-label">OBA</span>
            </div>
            <div className="icon-item">
              <span className="icon">🎬</span>
              <span className="icon-label">Cinema</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapLegend;