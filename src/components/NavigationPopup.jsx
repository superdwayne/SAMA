import React, { useState, useEffect } from 'react';
import './NavigationPopup.css';

const NavigationPopup = ({ artwork, userLocation, onNavigate, onClose, onInAppNavigate }) => {
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);

  useEffect(() => {
    if (userLocation) {
      calculateDistance();
    }
  }, [userLocation, artwork]);

  const calculateDistance = () => {
    if (!userLocation) return null;
    
    const R = 6371; // Earth's radius in km
    const dLat = (artwork.latitude - userLocation.latitude) * Math.PI / 180;
    const dLon = (artwork.longitude - userLocation.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLocation.latitude * Math.PI / 180) * Math.cos(artwork.latitude * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distanceKm = R * c;
    
    if (distanceKm < 1) {
      setDistance(`${Math.round(distanceKm * 1000)}m`);
      setDuration(`${Math.round(distanceKm * 1000 / 80)} min`); // ~80m/min walking
    } else {
      setDistance(`${distanceKm.toFixed(1)}km`);
      setDuration(`${Math.round(distanceKm * 12)} min`); // ~5km/h walking
    }
  };

  const getTypeLabel = (type) => {
    switch(type) {
      case 'gallery': return 'Gallery';
      case 'legal-wall': return 'Legal Wall';
      case 'artwork': return 'Street Art';
      case 'museum': return 'Museum';
      default: return 'Point of Interest';
    }
  };

  const handleInAppNavigation = () => {
    onInAppNavigate(artwork);
    onClose();
  };

  const handleExternalNavigation = () => {
    if (userLocation) {
      const destination = `${artwork.latitude},${artwork.longitude}`;
      const origin = `${userLocation.latitude},${userLocation.longitude}`;
      
      // Always use Google Maps for all devices
      window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=walking`, '_blank');
    }
  };

  return (
    <div className="navigation-popup-overlay">
      <div className="navigation-popup">
        <button className="close-button" onClick={onClose}>×</button>
        
        <div className="navigation-header">
          {artwork.image && (
            <img 
              src={artwork.image} 
              alt={artwork.title}
              className="navigation-image"
            />
          )}
          
          <h2>{artwork.title}</h2>
          
          <div className="artwork-info">
            <span className={`artwork-type ${artwork.type}`}>
              {getTypeLabel(artwork.type)}
            </span>
            {userLocation && distance && (
              <span className="distance-info">
                {distance} • {duration} walk
              </span>
            )}
          </div>
          
          {artwork.artist && (
            <p className="artwork-artist">by {artwork.artist}</p>
          )}
          
          <p className="artwork-description">{artwork.description}</p>
          
          {artwork.address && (
            <div className="address-section">
              <h3>📍 Location</h3>
              <p>{artwork.address}</p>
            </div>
          )}
          
          {artwork.openingHours && (
            <div className="hours-section">
              <h3>🕐 Opening Hours</h3>
              <p>{artwork.openingHours}</p>
            </div>
          )}
        </div>
        
        <div className="navigation-actions">
          {userLocation ? (
            <>
              <div className="navigation-options">
                <button className="navigate-button in-app" onClick={handleInAppNavigation}>
                  <span className="button-icon">🗺️</span>
                  <span className="button-text">
                    <span className="button-title">Navigate in App</span>
                    <span className="button-subtitle">View route on map</span>
                  </span>
                </button>
                
                <button className="navigate-button external" onClick={handleExternalNavigation}>
                  <span className="button-icon">🧭</span>
                  <span className="button-text">
                    <span className="button-title">Open in Google Maps</span>
                    <span className="button-subtitle">Turn-by-turn navigation</span>
                  </span>
                </button>
              </div>
            </>
          ) : (
            <div className="location-required">
              <p>📍 Enable location services to get directions</p>
              <button className="enable-location-button" onClick={() => {
                navigator.geolocation.getCurrentPosition(() => {
                  window.location.reload();
                });
              }}>
                Enable Location
              </button>
            </div>
          )}
          
          <button className="view-details-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default NavigationPopup;