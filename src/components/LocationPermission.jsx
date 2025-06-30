import React, { useState, useEffect } from 'react';
import { locationService, LocationErrors } from '../utils/location';
import './LocationPermission.css';

const LocationPermission = ({ onLocationGranted, onLocationDenied, showAlways = false }) => {
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [accuracy, setAccuracy] = useState(null);

  useEffect(() => {
    checkPermissionStatus();
    
    // Add location callback
    const handleLocationUpdate = (event, data) => {
      if (event === 'granted') {
        setPermissionStatus('granted');
        setCurrentLocation(data);
        setAccuracy(data.accuracy);
        if (onLocationGranted) {
          onLocationGranted(data);
        }
      } else if (event === 'location_update') {
        setCurrentLocation(data);
        setAccuracy(data.accuracy);
      } else if (event === 'error') {
        setError(data);
      }
    };

    locationService.addCallback(handleLocationUpdate);

    return () => {
      locationService.removeCallback(handleLocationUpdate);
    };
  }, [onLocationGranted]);

  const checkPermissionStatus = async () => {
    try {
      const status = await locationService.getPermissionStatus();
      setPermissionStatus(status);
      
      if (status === 'granted' && locationService.currentLocation) {
        setCurrentLocation(locationService.currentLocation);
        setAccuracy(locationService.currentLocation.accuracy);
        if (onLocationGranted) {
          onLocationGranted(locationService.currentLocation);
        }
      }
    } catch (error) {
      console.error('Error checking permission status:', error);
      setError(error);
    }
  };

  const requestPermission = async () => {
    setIsRequesting(true);
    setError(null);

    try {
      const location = await locationService.requestPermission({
        enableHighAccuracy: true,
        timeout: 10000
      });
      
      setPermissionStatus('granted');
      setCurrentLocation(location);
      setAccuracy(location.accuracy);
      
      if (onLocationGranted) {
        onLocationGranted(location);
      }
    } catch (error) {
      setPermissionStatus('denied');
      setError(error.message);
      
      if (onLocationDenied) {
        onLocationDenied(error);
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const retryPermission = () => {
    setError(null);
    setShowInstructions(false);
    requestPermission();
  };

  const openSettings = () => {
    setShowInstructions(true);
  };

  // Don't show if permission is granted and showAlways is false
  if (permissionStatus === 'granted' && !showAlways) {
    return null;
  }

  const getStatusIcon = () => {
    switch (permissionStatus) {
      case 'granted':
        return accuracy < 50 ? '📍' : '🎯';
      case 'denied':
        return '🚫';
      case 'prompt':
      case 'unknown':
        return '📍';
      case 'unsupported':
        return '❌';
      default:
        return '📍';
    }
  };

  const getStatusMessage = () => {
    switch (permissionStatus) {
      case 'granted':
        return accuracy ? 
          `Location found (${Math.round(accuracy)}m accuracy)` : 
          'Location access granted';
      case 'denied':
        return 'Location access denied';
      case 'prompt':
      case 'unknown':
        return 'Location permission needed for navigation';
      case 'unsupported':
        return 'Location services not supported';
      default:
        return 'Checking location permission...';
    }
  };

  const getErrorMessage = () => {
    switch (error) {
      case 'PERMISSION_DENIED':
        return 'You denied location access. Enable it in your browser settings to use navigation.';
      case 'POSITION_UNAVAILABLE':
        return 'Your location could not be determined. Please check your GPS and internet connection.';
      case 'TIMEOUT':
        return 'Location request timed out. Please try again.';
      case 'GEOLOCATION_NOT_SUPPORTED':
        return 'Your browser does not support location services.';
      default:
        return error || 'An error occurred while accessing your location.';
    }
  };

  const settingsInstructions = locationService.getSettingsInstructions();

  return (
    <div className="location-permission">
      <div className="permission-card">
        <div className="permission-header">
          <div className="status-icon">{getStatusIcon()}</div>
          <div className="status-details">
            <h3 className="status-title">{getStatusMessage()}</h3>
            {currentLocation && (
              <div className="location-details">
                <span className="coordinates">
                  {locationService.formatLocation(currentLocation)}
                </span>
                {accuracy && (
                  <span className={`accuracy ${accuracy < 50 ? 'good' : accuracy < 100 ? 'fair' : 'poor'}`}>
                    ±{Math.round(accuracy)}m
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="error-message">
            <div className="error-icon">⚠️</div>
            <div className="error-text">
              {getErrorMessage()}
            </div>
          </div>
        )}

        <div className="permission-content">
          {permissionStatus === 'unknown' || permissionStatus === 'prompt' ? (
            <div className="request-section">
              <p className="permission-explanation">
                🧭 <strong>Location needed for navigation</strong> to guide you to your selected street art destination.
              </p>
              <ul className="benefits-list">
                <li>🗺️ Turn-by-turn directions to your artwork</li>
                <li>📍 Real-time position tracking</li>
                <li>🎯 Know when you've arrived at your destination</li>
                <li>🚶‍♂️ Walking-optimized routes through Amsterdam</li>
              </ul>
              <div className="action-buttons">
                <button 
                  className="request-button primary"
                  onClick={requestPermission}
                  disabled={isRequesting}
                >
                  {isRequesting ? (
                    <>
                      <span className="spinner"></span>
                      Getting location...
                    </>
                  ) : (
                    <>
                      📍 Enable Navigation
                    </>
                  )}
                </button>
                <button 
                  className="skip-button"
                  onClick={() => onLocationDenied && onLocationDenied({ message: 'User skipped location' })}
                >
                  Skip Navigation
                </button>
              </div>
            </div>
          ) : permissionStatus === 'denied' ? (
            <div className="denied-section">
              <p className="denied-explanation">
                Location access is required for navigation features. You can enable it manually:
              </p>
              
              <div className="settings-instructions">
                <h4>📱 Enable Location in {settingsInstructions.browser}:</h4>
                <ol>
                  {settingsInstructions.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>

              <div className="denied-actions">
                <button 
                  className="retry-button"
                  onClick={retryPermission}
                  disabled={isRequesting}
                >
                  {isRequesting ? (
                    <>
                      <span className="spinner"></span>
                      Checking...
                    </>
                  ) : (
                    <>
                      🔄 Try Again
                    </>
                  )}
                </button>
                
                <button 
                  className="settings-button"
                  onClick={openSettings}
                >
                  ⚙️ Show Instructions
                </button>
              </div>

              {showInstructions && (
                <div className="detailed-instructions">
                  <h4>🔧 Detailed Setup Instructions:</h4>
                  <div className="instruction-steps">
                    <div className="step">
                      <strong>Step 1:</strong> Look for a location icon (📍) in your browser's address bar
                    </div>
                    <div className="step">
                      <strong>Step 2:</strong> Click the icon and select "Allow" or "Always allow"
                    </div>
                    <div className="step">
                      <strong>Step 3:</strong> Refresh this page and try again
                    </div>
                  </div>
                  
                  <div className="alternative-note">
                    <strong>Alternative:</strong> You can still browse street art locations without navigation, 
                    but you'll need to use external maps for directions.
                  </div>
                </div>
              )}
            </div>
          ) : permissionStatus === 'granted' ? (
            <div className="granted-section">
              <div className="success-message">
                ✅ <strong>Location access enabled!</strong> You can now use in-app navigation.
              </div>
              
              {accuracy && accuracy > 100 && (
                <div className="accuracy-warning">
                  ⚠️ Location accuracy is low ({Math.round(accuracy)}m). 
                  For better navigation, try moving to an open area with clear sky view.
                </div>
              )}
              
              <div className="location-status">
                <div className="status-item">
                  <span className="label">Current location:</span>
                  <span className="value">{locationService.formatLocation()}</span>
                </div>
                <div className="status-item">
                  <span className="label">Accuracy:</span>
                  <span className={`value accuracy ${accuracy < 50 ? 'good' : accuracy < 100 ? 'fair' : 'poor'}`}>
                    ±{Math.round(accuracy)}m
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="unsupported-section">
              <p className="unsupported-message">
                ❌ Your browser doesn't support location services. 
                You can still browse street art, but navigation features won't be available.
              </p>
            </div>
          )}
        </div>

        <div className="permission-footer">
          <div className="privacy-note">
            🔒 Location is only used for navigation and never stored or shared. You can disable it anytime.
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationPermission;
