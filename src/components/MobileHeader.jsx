import React, { useState } from 'react';
import './MobileHeader.css';

const MobileHeader = ({ 
  userAccess, 
  unlockedRegions, 
  onShowMagicLink, 
  onShowMapboxSettings, 
  onLogout,
  onShowRouteNavigator,
  isNavigating,
  navigationTarget,
  onStopNavigation 
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleMenuAction = (action) => {
    action();
    closeMenu();
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="mobile-header">
        <div className="mobile-header-content">
          <div className="mobile-title">
            <h1>Amsterdam Street Art</h1>
          </div>
          
          <button 
            className={`hamburger-menu ${isMenuOpen ? 'open' : ''}`}
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>

        {/* Navigation Bar for Mobile */}
        {isNavigating && navigationTarget && (
          <div className="mobile-navigation-bar">
            <div className="navigation-info">
              <h3>→ {navigationTarget.title}</h3>
            </div>
            <button 
              className="stop-navigation-button"
              onClick={onStopNavigation}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="mobile-menu-overlay" onClick={closeMenu}>
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <h2>Menu</h2>
              <button className="close-menu" onClick={closeMenu}>✕</button>
            </div>
            
            <div className="mobile-menu-content">
              {/* User Status Section */}
              {userAccess ? (
                <div className="menu-section">
                  <div className="user-info-card">
                    <div className="user-avatar">
                      <span className="avatar-icon">👤</span>
                    </div>
                    <div className="user-details">
                      <div className="user-email">{userAccess.email}</div>
                      <div className="access-status">
                        {userAccess.hasPurchased ? '🌟 Premium Access' : '🆓 Free Access'}
                      </div>
                      <div className="days-remaining">
                        {Math.max(0, Math.ceil((new Date(userAccess.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)))} days remaining
                      </div>
                    </div>
                  </div>
                  <button 
                    className="menu-button logout-button"
                    onClick={() => handleMenuAction(onLogout)}
                  >
                    🚪 Logout
                  </button>
                </div>
              ) : (
                <div className="menu-section">
                  <button 
                    className="menu-button primary"
                    onClick={() => handleMenuAction(onShowMagicLink)}
                  >
                    📧 Get Magic Link
                  </button>
                </div>
              )}

              {/* Quick Actions */}
              <div className="menu-section">
                <h3>Quick Actions</h3>
                <button 
                  className="menu-button"
                  onClick={() => handleMenuAction(onShowRouteNavigator)}
                >
                  🗺️ Browse Routes
                </button>
                <button 
                  className="menu-button"
                  onClick={() => handleMenuAction(onShowMapboxSettings)}
                >
                  ⚙️ Map Settings
                </button>
              </div>

              {/* Regions Status */}
              <div className="menu-section">
                <h3>Unlocked Regions</h3>
                <div className="regions-grid">
                  {['East', 'West', 'North', 'South', 'Center', 'Nieuw-West'].map(region => (
                    <div 
                      key={region}
                      className={`region-badge ${unlockedRegions.includes(region) ? 'unlocked' : 'locked'}`}
                    >
                      <span className="region-icon">
                        {unlockedRegions.includes(region) ? '🔓' : '🔒'}
                      </span>
                      <span className="region-name">{region}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="menu-section">
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-number">{unlockedRegions.length}</span>
                    <span className="stat-label">Regions</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">150+</span>
                    <span className="stat-label">Artworks</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">8</span>
                    <span className="stat-label">Routes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileHeader;