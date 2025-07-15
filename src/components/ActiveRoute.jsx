import React, { useState, useEffect } from 'react';
import { getRouteLocations } from '../data/routes';
import { streetArtLocations } from '../data/locations';
import BrickWallIcon from './BrickWallIcon';
import './ActiveRoute.css';

const ActiveRoute = ({ route, userLocation, onNavigateToStop, onEndRoute, onNextStop }) => {
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [completedStops, setCompletedStops] = useState([]);
  const [routeProgress, setRouteProgress] = useState(0);
  
  const routeLocations = getRouteLocations(route.id, streetArtLocations);
  const currentStop = routeLocations[currentStopIndex];
  const nextStop = routeLocations[currentStopIndex + 1];
  
  useEffect(() => {
    const progress = (completedStops.length / routeLocations.length) * 100;
    setRouteProgress(progress);
  }, [completedStops, routeLocations.length]);

  const handleCompleteStop = () => {
    if (currentStop && !completedStops.includes(currentStop.id)) {
      setCompletedStops(prev => [...prev, currentStop.id]);
    }
    
    if (currentStopIndex < routeLocations.length - 1) {
      setCurrentStopIndex(prev => prev + 1);
      if (onNextStop) {
        onNextStop(routeLocations[currentStopIndex + 1]);
      }
    }
  };

  const handleSkipStop = () => {
    if (currentStopIndex < routeLocations.length - 1) {
      setCurrentStopIndex(prev => prev + 1);
      if (onNextStop) {
        onNextStop(routeLocations[currentStopIndex + 1]);
      }
    }
  };

  const handleGoToStop = (stopIndex) => {
    setCurrentStopIndex(stopIndex);
    if (onNavigateToStop) {
      onNavigateToStop(routeLocations[stopIndex]);
    }
  };

  const calculateDistance = (point1, point2) => {
    if (!point1 || !point2) return null;
    
    const R = 6371; // Earth's radius in km
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLng = (point2.longitude - point1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c * 1000); // Return in meters
  };

  const distanceToCurrentStop = userLocation && currentStop ? 
    calculateDistance(userLocation, currentStop) : null;

  const isNearStop = distanceToCurrentStop !== null && distanceToCurrentStop < 50; // Within 50 meters

  return (
    <div className="active-route-container">
      {/* Route Header */}
      <div className="route-header-bar" style={{ borderLeftColor: route.color }}>
        <div className="route-info">
          <div className="route-icon-small">{route.icon}</div>
          <div className="route-details">
            <h3 className="route-title">{route.name}</h3>
            <div className="route-meta">
              <span>{completedStops.length} / {routeLocations.length} stops</span>
              <span>•</span>
              <span>{Math.round(routeProgress)}% complete</span>
            </div>
          </div>
        </div>
        <button className="end-route-btn" onClick={onEndRoute}>
          ✕ End Route
        </button>
      </div>

      {/* Progress Bar */}
      <div className="route-progress-bar">
        <div 
          className="progress-fill" 
          style={{ 
            width: `${routeProgress}%`,
            backgroundColor: route.color 
          }}
        />
      </div>

      {/* Current Stop Card */}
      {currentStop && (
        <div className="current-stop-card">
          <div className="stop-header">
            <div className="stop-number">
              Stop {currentStopIndex + 1}
            </div>
            {distanceToCurrentStop !== null && (
              <div className="distance-indicator">
                📍 {distanceToCurrentStop < 1000 ? 
                  `${Math.round(distanceToCurrentStop)}m` : 
                  `${(distanceToCurrentStop / 1000).toFixed(1)}km`
                } away
              </div>
            )}
          </div>
          
          <div className="stop-content">
            <h4 className="stop-title">{currentStop.title}</h4>
            <p className="stop-artist">by {currentStop.artist}</p>
            <p className="stop-description">{currentStop.description}</p>
            
            {currentStop.address && (
              <div className="stop-address">
                📍 {currentStop.address}
              </div>
            )}
            
            {currentStop.openingHours && (
              <div className="stop-hours">
                🕒 {currentStop.openingHours}
              </div>
            )}
          </div>

          <div className="stop-actions">
            <button 
              className="navigate-btn"
              onClick={() => onNavigateToStop && onNavigateToStop(currentStop)}
            >
              🧭 Navigate Here
            </button>
            
            {isNearStop ? (
              <button 
                className="complete-btn completed"
                onClick={handleCompleteStop}
              >
                ✅ I'm Here!
              </button>
            ) : (
              <button 
                className="complete-btn"
                onClick={handleCompleteStop}
              >
                ✅ Mark Complete
              </button>
            )}
            
            <button 
              className="skip-btn"
              onClick={handleSkipStop}
            >
              ⏭️ Skip
            </button>
          </div>
        </div>
      )}

      {/* Next Stop Preview */}
      {nextStop && (
        <div className="next-stop-preview">
          <h5>📍 Next Stop:</h5>
          <div className="next-stop-info">
            <span className="next-stop-title">{nextStop.title}</span>
            <span className="next-stop-artist">by {nextStop.artist}</span>
          </div>
        </div>
      )}

      {/* Route Complete */}
      {currentStopIndex >= routeLocations.length - 1 && completedStops.length === routeLocations.length && (
        <div className="route-complete">
          <div className="completion-celebration">
            <h3>🎉 Route Complete!</h3>
            <p>You've visited all {routeLocations.length} stops on the {route.name} route!</p>
            <button className="share-completion-btn">
              📱 Share Your Achievement
            </button>
          </div>
        </div>
      )}

      {/* Route Overview (Collapsible) */}
      <div className="route-overview">
        <details>
          <summary>
            📋 Route Overview ({routeLocations.length} stops)
          </summary>
          <div className="stops-list">
            {routeLocations.map((location, index) => (
              <div 
                key={location.id} 
                className={`stop-item ${
                  index === currentStopIndex ? 'current' : ''
                } ${
                  completedStops.includes(location.id) ? 'completed' : ''
                }`}
                onClick={() => handleGoToStop(index)}
              >
                <div className="stop-marker">
                  {completedStops.includes(location.id) ? '✅' : 
                   index === currentStopIndex ? '📍' : index + 1}
                </div>
                <div className="stop-details">
                  <h6>{location.title}</h6>
                  <p>{location.artist}</p>
                </div>
                <div className="stop-type">
                  {location.type === 'gallery' ? '🏛️' : 
                   location.type === 'legal-wall' ? <BrickWallIcon size={16} /> : 
                   location.type === 'artwork' ? '🖼️' : 
                   location.type === 'museum' ? '🏛️' : '📍'}
                </div>
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
};

export default ActiveRoute;
