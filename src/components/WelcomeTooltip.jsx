import React from 'react';
import './WelcomeTooltip.css';

const WelcomeTooltip = ({ onClose }) => {
  return (
    <div className="welcome-overlay">
      <div className="welcome-tooltip">
        <button className="close-button" onClick={onClose}>×</button>
        
        <h2>Welcome to Amsterdam Street Art Map</h2>
        
        <div className="welcome-content">
          <p>Discover the vibrant street art scene across Amsterdam's 7 districts!</p>
          
          <div className="instructions">
            <h3>How to Navigate:</h3>
            <ul>
              <li>🗺️ Click and drag to move around the map</li>
              <li>🔍 Scroll or pinch to zoom in/out</li>
              <li>📍 Click on markers to view artwork details</li>
              <li>🏘️ Click on districts to explore different areas</li>
              <li>📍 Allow location access to see your position</li>
            </ul>
          </div>
          
          <div className="access-info">
            <h3>Access Information:</h3>
            <div className="access-item">
              <span className="access-icon">🟢</span>
              <span>Centre district is <strong>FREE</strong> to explore</span>
            </div>
            <div className="access-item">
              <span className="access-icon">🔴</span>
              <span>Other districts require purchase to unlock</span>
            </div>
          </div>
          
          <div className="tip">
            <p><strong>💡 Tip:</strong> Click on any locked district to unlock it for €4.99. Each district offers unique street art experiences!</p>
          </div>
          
          <button className="start-button" onClick={onClose}>
            Start Exploring
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeTooltip;