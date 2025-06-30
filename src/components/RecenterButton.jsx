import React from 'react';
import './RecenterButton.css';

const RecenterButton = ({ onRecenter, isNavigating }) => {
  if (!isNavigating) return null;

  return (
    <button 
      className="recenter-button"
      onClick={onRecenter}
      title="Center on my location"
    >
      <div className="recenter-icon">
        <div className="location-dot"></div>
        <div className="location-rings">
          <div className="ring ring-1"></div>
          <div className="ring ring-2"></div>
        </div>
      </div>
    </button>
  );
};

export default RecenterButton;
