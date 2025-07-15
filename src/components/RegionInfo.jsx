import React from 'react';
import BrickWallIcon from './BrickWallIcon';
import './RegionInfo.css';

const RegionInfo = ({ region, onClose, isUnlocked, onUnlock }) => {
  return (
    <>
      <div className="region-info-backdrop" onClick={onClose}></div>
      <div className="region-info-panel">
        <button className="region-close-button" onClick={onClose}>×</button>
        
        <h2>{region.name}</h2>
        
        <div className={`region-status ${isUnlocked ? 'unlocked' : 'locked'}`}>
          {isUnlocked ? '🔓 Unlocked' : '🔒 Locked'}
        </div>
        
        <div className="region-details">
          <p>{region.description}</p>
          
          {isUnlocked ? (
            <>
              <div className="region-stats">
                <h3>District Highlights</h3>
                <ul>
                  <li>📍 {region.artworkCount || 0} Artworks</li>
                  <li>🏛️ {region.galleryCount || 0} Galleries</li>
                  <li>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <BrickWallIcon size={16} />
                      {region.legalWallCount || 0} Legal Walls
                    </span>
                  </li>
                  <li>👥 {region.artistCount || 0} Featured Artists</li>
                </ul>
              </div>
              
              <div className="region-featured">
                <h3>Featured Locations</h3>
                <p>{region.featuredInfo || 'Explore this district to discover amazing street art!'}</p>
              </div>
            </>
          ) : (
            <div className="locked-message">
              <p>This district is locked. Purchase access to explore all locations and artworks in {region.name}.</p>
              <button className="unlock-button" onClick={onUnlock}>
                Unlock {region.name}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default RegionInfo;