import React from 'react';
import './NavigationCompass.css';

const NavigationCompass = ({ bearing, nextTurnBearing, nextTurnDirection }) => {
  const compassRotation = bearing ? -bearing : 0;
  const nextTurnAngle = nextTurnBearing ? nextTurnBearing - bearing : 0;

  return (
    <div className="navigation-compass">
      {/* Compass Background */}
      <div 
        className="compass-background"
        style={{ transform: `rotate(${compassRotation}deg)` }}
      >
        {/* North Indicator */}
        <div className="north-indicator">N</div>
        
        {/* Compass Marks */}
        <div className="compass-marks">
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(angle => (
            <div 
              key={angle}
              className={`compass-mark ${angle % 90 === 0 ? 'major' : 'minor'}`}
              style={{ transform: `rotate(${angle}deg)` }}
            />
          ))}
        </div>
      </div>

      {/* Direction Arrow (always points up/forward) */}
      <div className="direction-arrow">
        <div className="arrow-head">↑</div>
      </div>

      {/* Next Turn Indicator */}
      {nextTurnDirection && (
        <div 
          className="next-turn-indicator"
          style={{ transform: `rotate(${nextTurnAngle}deg)` }}
        >
          <div className="turn-arrow">
            {nextTurnDirection === 'left' ? '↰' : 
             nextTurnDirection === 'right' ? '↱' : 
             nextTurnDirection === 'straight' ? '↑' : '⤴️'}
          </div>
        </div>
      )}

      {/* Bearing Display */}
      <div className="bearing-display">
        <span className="bearing-value">
          {bearing ? `${Math.round(bearing)}°` : '--°'}
        </span>
      </div>
    </div>
  );
};

export default NavigationCompass;
