import React, { useState, useEffect } from 'react';
import { navigationService } from '../utils/navigation';
import './EnhancedNavigation.css';

const EnhancedNavigation = ({ 
  userLocation, 
  destination, 
  onNavigationEnd, 
  mapRef,
  mapboxToken,
  onRouteCalculated,
  onStepAdvanced,
  viewport
}) => {
  const [currentRoute, setCurrentRoute] = useState(null);
  const [currentStep, setCurrentStep] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [distanceToNext, setDistanceToNext] = useState(0);
  const [distanceToDestination, setDistanceToDestination] = useState(0);
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [eta, setEta] = useState(null);
  const [routeSteps, setRouteSteps] = useState([]);
  const [showStepsList, setShowStepsList] = useState(false);

  useEffect(() => {
    if (userLocation && destination && mapboxToken) {
      startNavigation();
    }
    
    return () => {
      navigationService.stopNavigation();
    };
  }, [userLocation, destination, mapboxToken]);

  // Start navigation
  const startNavigation = async () => {
    try {
      setIsNavigating(true);
      navigationService.mapboxToken = mapboxToken;

      const route = await navigationService.startNavigation(
        userLocation,
        destination,
        {
          onRouteCalculated: (route) => {
            setCurrentRoute(route);
            setRouteSteps(route.steps);
            setCurrentStep(route.steps[0]);
            calculateETA(route);
            
            // Call parent callback
            if (onRouteCalculated) {
              onRouteCalculated(route);
            }
            
            // Don't fit map to route during navigation - let parent handle viewport
            // The parent will briefly show the route then zoom back to user location
          },
          onLocationUpdate: (data) => {
            setCurrentStep(data.currentStep);
            setProgress(data.progress);
            setDistanceToNext(data.distanceToNext);
            setDistanceToDestination(data.distanceToDestination);
            updateETA(data.distanceToDestination);
          },
          onStepAdvanced: (step) => {
            setCurrentStep(step);
            // Call parent callback
            if (onStepAdvanced) {
              onStepAdvanced(step);
            }
            // Voice announcement could be added here
            console.log('Next instruction:', step.voiceInstruction);
          },
          onOffRoute: () => {
            setIsOffRoute(true);
            setIsRecalculating(true);
          },
          onRouteRecalculated: (newRoute) => {
            setCurrentRoute(newRoute);
            setRouteSteps(newRoute.steps);
            setIsOffRoute(false);
            setIsRecalculating(false);
            calculateETA(newRoute);
          },
          onNavigationCompleted: () => {
            handleNavigationComplete();
          },
          onError: (error) => {
            console.error('Navigation error:', error);
            setIsNavigating(false);
          }
        }
      );

    } catch (error) {
      console.error('Failed to start navigation:', error);
      setIsNavigating(false);
    }
  };

  // Update user location
  useEffect(() => {
    if (userLocation && isNavigating) {
      navigationService.updateLocation(userLocation);
    }
  }, [userLocation, isNavigating]);

  // Calculate ETA
  const calculateETA = (route) => {
    if (route && route.duration) {
      const now = new Date();
      const arrivalTime = new Date(now.getTime() + route.duration * 1000);
      setEta(arrivalTime);
    }
  };

  // Update ETA based on current distance
  const updateETA = (distanceRemaining) => {
    if (currentRoute && distanceRemaining) {
      const avgSpeed = 1.4; // Average walking speed m/s
      const timeRemaining = distanceRemaining / avgSpeed;
      const now = new Date();
      const arrivalTime = new Date(now.getTime() + timeRemaining * 1000);
      setEta(arrivalTime);
    }
  };

  // Handle navigation completion
  const handleNavigationComplete = () => {
    setIsNavigating(false);
    // Could show completion celebration here
    setTimeout(() => {
      onNavigationEnd();
    }, 2000);
  };

  // Stop navigation
  const handleStopNavigation = () => {
    navigationService.stopNavigation();
    setIsNavigating(false);
    onNavigationEnd();
  };

  // Get next few steps preview
  const getNextSteps = () => {
    if (!routeSteps || !currentStep) return [];
    const currentIndex = routeSteps.findIndex(step => step.id === currentStep.id);
    return routeSteps.slice(currentIndex + 1, currentIndex + 4);
  };

  if (!isNavigating || !currentStep) {
    return null;
  }

  // Calculate relative arrow rotation
  const mapBearing = viewport?.bearing || 0;
  const nextBearing = currentStep.maneuver.bearing_after || 0;
  const relativeArrowRotation = nextBearing - mapBearing;

  return (
    <div className="enhanced-navigation">
      {/* Main Navigation Panel */}
      <div className="nav-panel">
        {/* Status Bar */}
        <div className="nav-status">
          {isRecalculating && (
            <div className="recalculating-banner">
              🔄 Recalculating route...
            </div>
          )}
          {isOffRoute && !isRecalculating && (
            <div className="off-route-banner">
              ⚠️ Off route - Getting you back on track
            </div>
          )}
        </div>

        {/* Current Instruction with Rotating Arrow */}
        <div className="current-instruction" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '24px 0' }}>
          <div
            className="turn-arrow"
            style={{
              transform: `rotate(${relativeArrowRotation}deg)`,
              margin: '0 auto',
              width: 80,
              height: 80
            }}
          >
            <svg width="80" height="80" viewBox="0 0 80 80">
              <polygon points="40,10 70,70 40,55 10,70" fill="#007cbf" />
            </svg>
          </div>
          <div className="instruction-text" style={{ fontSize: 24, fontWeight: 'bold', margin: '16px 0' }}>
            {currentStep.instruction}
          </div>
          <div className="instruction-distance" style={{ fontSize: 18 }}>
            {navigationService.formatDistance(distanceToNext)}
          </div>
        </div>

        {/* Street Name */}
        {currentStep.streetName && (
          <div className="street-name">
            Continue on <strong>{currentStep.streetName}</strong>
          </div>
        )}

        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="progress-text">
            {Math.round(progress * 100)}% complete
          </div>
        </div>

        {/* Route Summary */}
        <div className="route-summary">
          <div className="summary-item">
            <span className="summary-icon">📍</span>
            <span className="summary-text">
              {navigationService.formatDistance(distanceToDestination)}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-icon">⏱️</span>
            <span className="summary-text">
              {currentRoute ? navigationService.formatDuration(
                currentRoute.duration * (1 - progress)
              ) : ''}
            </span>
          </div>
          {eta && (
            <div className="summary-item">
              <span className="summary-icon">🕐</span>
              <span className="summary-text">
                Arrive {eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>

        {/* Next Steps Preview */}
        <div className="next-steps-preview">
          <button 
            className="toggle-steps"
            onClick={() => setShowStepsList(!showStepsList)}
          >
            {showStepsList ? '📖 Hide Steps' : '📋 Show Upcoming Steps'}
          </button>
          
          {showStepsList && (
            <div className="steps-list">
              {getNextSteps().map((step, index) => (
                <div key={step.id} className="step-item">
                  <div className="step-icon">
                    {navigationService.getManeuverIcon(
                      step.maneuver.type, 
                      step.maneuver.modifier
                    )}
                  </div>
                  <div className="step-text">
                    <div className="step-instruction">{step.instruction}</div>
                    <div className="step-distance">
                      {navigationService.formatDistance(step.distance)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="nav-controls">
          <button 
            className="nav-button secondary"
            onClick={() => setShowStepsList(!showStepsList)}
          >
            📋 Steps
          </button>
          <button 
            className="nav-button primary"
            onClick={handleStopNavigation}
          >
            ✕ End Navigation
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedNavigation;
