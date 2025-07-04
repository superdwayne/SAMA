import React, { useState, useEffect } from 'react';
import { enhancedNavigationService } from '../utils/enhancedNavigation';
import './EnhancedNavigation.css';

const SmartNavigation = ({ 
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
  // Enhanced state for dynamic repositioning
  const [wrongTurnCount, setWrongTurnCount] = useState(0);
  const [recalculationCount, setRecalculationCount] = useState(0);
  const [userHeading, setUserHeading] = useState(null);
  const [expectedHeading, setExpectedHeading] = useState(null);
  const [distanceFromRoute, setDistanceFromRoute] = useState(0);
  const [navigationQuality, setNavigationQuality] = useState('excellent');
  const [lastWrongTurn, setLastWrongTurn] = useState(null);

  useEffect(() => {
    if (userLocation && destination && mapboxToken) {
      startNavigation();
    }
    return () => {
      enhancedNavigationService.stopNavigation();
    };
  }, [userLocation, destination, mapboxToken]);

  // Start enhanced navigation
  const startNavigation = async () => {
    try {
      setIsNavigating(true);
      setWrongTurnCount(0);
      setRecalculationCount(0);
      enhancedNavigationService.mapboxToken = mapboxToken;
      const route = await enhancedNavigationService.startNavigation(
        userLocation,
        destination,
        {
          onRouteCalculated: (route) => {
            setCurrentRoute(route);
            setRouteSteps(route.steps);
            setCurrentStep(route.steps[0]);
            calculateETA(route);
            if (onRouteCalculated) {
              onRouteCalculated(route);
            }
          },
          onLocationUpdate: (data) => {
            setCurrentStep(data.currentStep);
            setProgress(data.progress);
            setDistanceToNext(data.distanceToNext);
            setDistanceToDestination(data.distanceToDestination);
            setDistanceFromRoute(data.distanceToRoute || 0);
            setUserHeading(data.userHeading);
            setExpectedHeading(data.expectedHeading);
            // Update navigation quality based on metrics
            updateNavigationQuality(data);
            updateETA(data.distanceToDestination);
          },
          onStepAdvanced: (step) => {
            setCurrentStep(step);
            if (onStepAdvanced) {
              onStepAdvanced(step);
            }
            console.log('Next instruction:', step.voiceInstruction);
          },
          // Enhanced wrong turn detection
          onWrongTurn: (data) => {
            setWrongTurnCount(prev => prev + 1);
            setLastWrongTurn({
              location: data.location,
              distanceFromRoute: data.distanceFromRoute,
              headingDeviation: data.headingDeviation,
              timestamp: new Date()
            });
            console.log('🔄 Wrong turn detected:', data);
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
            setRecalculationCount(prev => prev + 1);
            calculateETA(newRoute);
            console.log('✅ Route recalculated successfully');
          },
          onRecalculationFailed: (error) => {
            setIsRecalculating(false);
            console.error('❌ Route recalculation failed:', error);
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

  // Update navigation quality based on performance metrics
  const updateNavigationQuality = (data) => {
    const metrics = {
      distanceFromRoute: data.distanceToRoute || 0,
      headingDeviation: data.headingDeviation || 0,
      wrongTurns: wrongTurnCount,
      recalculations: recalculationCount
    };
    let quality = 'excellent';
    if (metrics.distanceFromRoute > 20 || metrics.headingDeviation > 30 || metrics.wrongTurns > 2) {
      quality = 'poor';
    } else if (metrics.distanceFromRoute > 10 || metrics.headingDeviation > 15 || metrics.wrongTurns > 1) {
      quality = 'good';
    } else if (metrics.distanceFromRoute > 5 || metrics.wrongTurns > 0) {
      quality = 'fair';
    }
    setNavigationQuality(quality);
  };

  // Update user location with enhanced service
  useEffect(() => {
    if (userLocation && isNavigating) {
      enhancedNavigationService.updateLocation(userLocation);
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
    setTimeout(() => {
      onNavigationEnd();
    }, 2000);
  };

  // Stop navigation
  const handleStopNavigation = () => {
    enhancedNavigationService.stopNavigation();
    setIsNavigating(false);
    onNavigationEnd();
  };

  // Get next few steps preview
  const getNextSteps = () => {
    if (!routeSteps || !currentStep) return [];
    const currentIndex = routeSteps.findIndex(step => step.id === currentStep.id);
    return routeSteps.slice(currentIndex + 1, currentIndex + 4);
  };

  // Get navigation quality indicator
  const getQualityIndicator = () => {
    const indicators = {
      excellent: { icon: '🟢', text: 'On track', color: '#10b981' },
      fair: { icon: '🟡', text: 'Minor deviation', color: '#f59e0b' },
      good: { icon: '🟠', text: 'Slight off course', color: '#f97316' },
      poor: { icon: '🔴', text: 'Repositioning needed', color: '#ef4444' }
    };
    return indicators[navigationQuality] || indicators.excellent;
  };

  if (!isNavigating || !currentStep) {
    return null;
  }

  // Calculate relative arrow rotation
  const mapBearing = viewport?.bearing || 0;
  const nextBearing = currentStep.maneuver.bearing_after || 0;
  const relativeArrowRotation = nextBearing - mapBearing;
  const qualityIndicator = getQualityIndicator();

  return (
    <div className="enhanced-navigation smart-navigation">
      {/* Enhanced Status Bar */}
      <div className="nav-status">
        {isRecalculating && (
          <div className="recalculating-banner smart-banner">
            <div className="banner-content">
              🔄 <span>Recalculating route...</span>
              <div className="pulse-animation"></div>
            </div>
          </div>
        )}
        {isOffRoute && !isRecalculating && (
          <div className="off-route-banner smart-banner">
            <div className="banner-content">
              ⚠️ <span>Wrong turn detected - Getting you back on track</span>
            </div>
          </div>
        )}
        {/* Navigation Quality Indicator */}
        <div className="quality-indicator" style={{ color: qualityIndicator.color }}>
          <span className="quality-icon">{qualityIndicator.icon}</span>
          <span className="quality-text">{qualityIndicator.text}</span>
          {distanceFromRoute > 0 && (
            <span className="distance-from-route">
              ({enhancedNavigationService.formatDistance(distanceFromRoute)} from route)
            </span>
          )}
        </div>
      </div>
      {/* Enhanced Main Navigation Panel */}
      <div className="nav-panel smart-panel">
        {/* Current Instruction with Enhanced Arrow */}
        <div className="current-instruction smart-instruction">
          <div
            className="turn-arrow smart-arrow"
            style={{
              transform: `rotate(${relativeArrowRotation}deg)`,
              filter: isOffRoute ? 'brightness(0.7) saturate(0.5)' : 'none'
            }}
          >
            <svg width="80" height="80" viewBox="0 0 80 80">
              <defs>
                <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={isOffRoute ? '#ef4444' : '#007cbf'} />
                  <stop offset="100%" stopColor={isOffRoute ? '#dc2626' : '#0056b3'} />
                </linearGradient>
              </defs>
              <polygon 
                points="40,10 70,70 40,55 10,70" 
                fill="url(#arrowGradient)"
                stroke="#fff"
                strokeWidth="2"
              />
            </svg>
          </div>
          <div className="instruction-content">
            <div className="instruction-text">
              {currentStep.instruction}
            </div>
            <div className="instruction-distance">
              {enhancedNavigationService.formatDistance(distanceToNext)}
            </div>
            {/* Heading Information */}
            {userHeading && expectedHeading && (
              <div className="heading-info">
                <span className="heading-label">Direction:</span>
                <span className="heading-value">
                  {Math.round(userHeading)}° 
                  {Math.abs(userHeading - expectedHeading) > 15 && (
                    <span className="heading-deviation">
                      (±{Math.round(Math.abs(userHeading - expectedHeading))}°)
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
        {/* Street Name */}
        {currentStep.streetName && (
          <div className="street-name smart-street">
            Continue on <strong>{currentStep.streetName}</strong>
          </div>
        )}
        {/* Enhanced Progress Bar */}
        <div className="progress-container smart-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ 
                width: `${progress * 100}%`,
                backgroundColor: qualityIndicator.color
              }}
            />
            {/* Milestone markers */}
            <div className="progress-markers">
              {[25, 50, 75].map(milestone => (
                <div 
                  key={milestone}
                  className={`progress-marker ${progress * 100 >= milestone ? 'passed' : ''}`}
                  style={{ left: `${milestone}%` }}
                />
              ))}
            </div>
          </div>
          <div className="progress-text">
            {Math.round(progress * 100)}% complete
            {wrongTurnCount > 0 && (
              <span className="wrong-turn-count"> • {wrongTurnCount} wrong turn{wrongTurnCount > 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
        {/* Enhanced Route Summary */}
        <div className="route-summary smart-summary">
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-icon">📍</span>
              <div className="summary-content">
                <span className="summary-label">Distance</span>
                <span className="summary-value">
                  {enhancedNavigationService.formatDistance(distanceToDestination)}
                </span>
              </div>
            </div>
            <div className="summary-item">
              <span className="summary-icon">⏱️</span>
              <div className="summary-content">
                <span className="summary-label">Time</span>
                <span className="summary-value">
                  {currentRoute ? enhancedNavigationService.formatDuration(
                    currentRoute.duration * (1 - progress)
                  ) : ''}
                </span>
              </div>
            </div>
            {eta && (
              <div className="summary-item">
                <span className="summary-icon">🕐</span>
                <div className="summary-content">
                  <span className="summary-label">Arrival</span>
                  <span className="summary-value">
                    {eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            )}
            {recalculationCount > 0 && (
              <div className="summary-item">
                <span className="summary-icon">🔄</span>
                <div className="summary-content">
                  <span className="summary-label">Recalculated</span>
                  <span className="summary-value">{recalculationCount}x</span>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Next Steps Preview with Enhanced UI */}
        <div className="next-steps-preview smart-steps">
          <button 
            className="toggle-steps smart-toggle"
            onClick={() => setShowStepsList(!showStepsList)}
          >
            <span className="toggle-icon">{showStepsList ? '📖' : '📋'}</span>
            <span className="toggle-text">
              {showStepsList ? 'Hide Steps' : 'Show Upcoming Steps'}
            </span>
            <span className="toggle-arrow">{showStepsList ? '▼' : '▶'}</span>
          </button>
          {showStepsList && (
            <div className="steps-list smart-steps-list">
              {getNextSteps().map((step, index) => (
                <div key={step.id} className="step-item smart-step">
                  <div className="step-number">{index + 2}</div>
                  <div className="step-icon">
                    {enhancedNavigationService.getManeuverIcon(
                      step.maneuver.type, 
                      step.maneuver.modifier
                    )}
                  </div>
                  <div className="step-content">
                    <div className="step-instruction">{step.instruction}</div>
                    <div className="step-details">
                      <span className="step-distance">
                        {enhancedNavigationService.formatDistance(step.distance)}
                      </span>
                      {step.streetName && step.streetName !== 'Continue' && (
                        <span className="step-street">on {step.streetName}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Enhanced Controls */}
        <div className="nav-controls smart-controls">
          <button 
            className="nav-button secondary smart-button"
            onClick={() => setShowStepsList(!showStepsList)}
          >
            <span className="button-icon">📋</span>
            <span className="button-text">Steps</span>
          </button>
          {wrongTurnCount > 0 && (
            <button 
              className="nav-button tertiary smart-button"
              onClick={() => {
                // Reset wrong turn counter
                setWrongTurnCount(0);
                setLastWrongTurn(null);
              }}
            >
              <span className="button-icon">🔄</span>
              <span className="button-text">Reset</span>
            </button>
          )}
          <button 
            className="nav-button primary smart-button"
            onClick={handleStopNavigation}
          >
            <span className="button-icon">✕</span>
            <span className="button-text">End Navigation</span>
          </button>
        </div>
        {/* Wrong Turn History (for debugging/feedback) */}
        {lastWrongTurn && process.env.NODE_ENV === 'development' && (
          <div className="debug-info">
            <h4>Last Wrong Turn:</h4>
            <p>Distance from route: {enhancedNavigationService.formatDistance(lastWrongTurn.distanceFromRoute)}</p>
            <p>Heading deviation: {Math.round(lastWrongTurn.headingDeviation)}°</p>
            <p>Time: {lastWrongTurn.timestamp.toLocaleTimeString()}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartNavigation;