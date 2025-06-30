// Location permission and management service
export class LocationService {
  constructor() {
    this.watchId = null;
    this.currentLocation = null;
    this.permissionStatus = 'unknown'; // 'granted', 'denied', 'prompt', 'unknown'
    this.callbacks = new Set();
    this.isWatching = false;
    this.highAccuracy = false;
  }

  // Check if geolocation is supported
  isSupported() {
    return 'geolocation' in navigator;
  }

  // Get current permission status
  async getPermissionStatus() {
    if (!this.isSupported()) {
      return 'unsupported';
    }

    try {
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        this.permissionStatus = permission.state;
        return permission.state;
      }
    } catch (error) {
      console.log('Permissions API not supported, will detect on request');
    }

    return this.permissionStatus;
  }

  // Request location permission with user-friendly flow
  async requestPermission(options = {}) {
    const {
      showPrompt = true,
      enableHighAccuracy = false,
      timeout = 10000,
      maximumAge = 300000 // 5 minutes
    } = options;

    if (!this.isSupported()) {
      throw new Error('GEOLOCATION_NOT_SUPPORTED');
    }

    try {
      // First try to get current position to trigger permission prompt
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy,
            timeout,
            maximumAge
          }
        );
      });

      this.currentLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      };

      this.permissionStatus = 'granted';
      this.notifyCallbacks('granted', this.currentLocation);
      return this.currentLocation;

    } catch (error) {
      this.permissionStatus = 'denied';
      
      // Handle different error types
      switch (error.code) {
        case error.PERMISSION_DENIED:
          throw new Error('PERMISSION_DENIED');
        case error.POSITION_UNAVAILABLE:
          throw new Error('POSITION_UNAVAILABLE');
        case error.TIMEOUT:
          throw new Error('TIMEOUT');
        default:
          throw new Error('UNKNOWN_ERROR');
      }
    }
  }

  // Start watching location changes
  async startWatching(options = {}) {
    const {
      enableHighAccuracy = false,
      timeout = 30000,
      maximumAge = 10000
    } = options;

    if (this.permissionStatus !== 'granted') {
      await this.requestPermission({ enableHighAccuracy });
    }

    if (this.isWatching) {
      this.stopWatching();
    }

    this.highAccuracy = enableHighAccuracy;
    this.isWatching = true;

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.currentLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp
        };

        this.notifyCallbacks('location_update', this.currentLocation);
      },
      (error) => {
        this.notifyCallbacks('error', error);
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge
      }
    );

    return this.watchId;
  }

  // Stop watching location
  stopWatching() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isWatching = false;
      this.notifyCallbacks('watch_stopped');
    }
  }

  // Get current location (one-time request)
  async getCurrentLocation(options = {}) {
    if (this.permissionStatus !== 'granted') {
      await this.requestPermission(options);
    }

    return this.currentLocation;
  }

  // Add callback for location updates
  addCallback(callback) {
    this.callbacks.add(callback);
  }

  // Remove callback
  removeCallback(callback) {
    this.callbacks.delete(callback);
  }

  // Notify all callbacks
  notifyCallbacks(event, data) {
    this.callbacks.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Error in location callback:', error);
      }
    });
  }

  // Check if location is accurate enough for navigation
  isAccurateEnough(requiredAccuracy = 50) {
    return this.currentLocation && 
           this.currentLocation.accuracy <= requiredAccuracy;
  }

  // Get human-readable permission status
  getPermissionMessage() {
    switch (this.permissionStatus) {
      case 'granted':
        return 'Location access granted';
      case 'denied':
        return 'Location access denied. Please enable in browser settings.';
      case 'prompt':
        return 'Location permission required';
      case 'unsupported':
        return 'Location services not supported by this browser';
      default:
        return 'Location permission unknown';
    }
  }

  // Get settings instructions for different browsers
  getSettingsInstructions() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('chrome')) {
      return {
        browser: 'Chrome',
        steps: [
          'Click the location icon in the address bar',
          'Select "Always allow" for location access',
          'Refresh the page'
        ]
      };
    } else if (userAgent.includes('firefox')) {
      return {
        browser: 'Firefox',
        steps: [
          'Click the shield icon in the address bar',
          'Click "Turn off Blocking" for location',
          'Refresh the page'
        ]
      };
    } else if (userAgent.includes('safari')) {
      return {
        browser: 'Safari',
        steps: [
          'Go to Safari > Preferences > Websites',
          'Click "Location" in the sidebar',
          'Set this website to "Allow"'
        ]
      };
    } else {
      return {
        browser: 'Browser',
        steps: [
          'Look for a location icon in the address bar',
          'Allow location access for this website',
          'Refresh the page if needed'
        ]
      };
    }
  }

  // Format location for display
  formatLocation(location = this.currentLocation) {
    if (!location) return 'Location unknown';
    
    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  }

  // Calculate distance between two points
  calculateDistance(point1, point2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLng = (point2.longitude - point1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Check if user is near a specific location
  isNearLocation(targetLocation, threshold = 100) {
    if (!this.currentLocation) return false;
    
    const distance = this.calculateDistance(this.currentLocation, targetLocation);
    return distance <= threshold;
  }

  // Cleanup
  destroy() {
    this.stopWatching();
    this.callbacks.clear();
    this.currentLocation = null;
  }
}

// Export singleton instance
export const locationService = new LocationService();

// Error types for better error handling
export const LocationErrors = {
  GEOLOCATION_NOT_SUPPORTED: 'Geolocation is not supported by this browser',
  PERMISSION_DENIED: 'Location access denied by user',
  POSITION_UNAVAILABLE: 'Location information unavailable',
  TIMEOUT: 'Location request timed out',
  UNKNOWN_ERROR: 'Unknown location error occurred'
};
