// Enhanced navigation service for better in-app directions
export class NavigationService {
  constructor(mapboxToken) {
    this.mapboxToken = mapboxToken;
    this.currentRoute = null;
    this.currentStep = 0;
    this.isNavigating = false;
    this.userLocation = null;
    this.destination = null;
    this.callbacks = {};
    this.offRouteThreshold = 50; // meters
    this.stepAdvanceThreshold = 25; // meters
  }

  // Get detailed route with turn-by-turn instructions
  async getDetailedRoute(start, end, profile = 'walking') {
    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/${profile}/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?` +
        new URLSearchParams({
          geometries: 'geojson',
          steps: 'true',
          voice_instructions: 'true',
          banner_instructions: 'true',
          overview: 'full',
          access_token: this.mapboxToken
        })
      );

      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        return {
          geometry: route.geometry,
          duration: route.duration,
          distance: route.distance,
          steps: this.processSteps(route.legs[0].steps)
        };
      }
      
      throw new Error('No route found');
    } catch (error) {
      console.error('Error fetching route:', error);
      throw error;
    }
  }

  // Process steps with enhanced information
  processSteps(steps) {
    return steps.map((step, index) => ({
      id: index,
      instruction: step.maneuver.instruction,
      distance: step.distance,
      duration: step.duration,
      geometry: step.geometry,
      maneuver: {
        type: step.maneuver.type,
        modifier: step.maneuver.modifier,
        location: step.maneuver.location
      },
      streetName: step.name || 'Continue',
      voiceInstruction: step.voiceInstructions?.[0]?.announcement || step.maneuver.instruction
    }));
  }

  // Start navigation
  async startNavigation(start, destination, callbacks = {}) {
    try {
      this.userLocation = start;
      this.destination = destination;
      this.callbacks = callbacks;
      this.isNavigating = true;
      this.currentStep = 0;

      const route = await this.getDetailedRoute(start, destination);
      this.currentRoute = route;

      if (callbacks.onRouteCalculated) {
        callbacks.onRouteCalculated(route);
      }

      return route;
    } catch (error) {
      if (callbacks.onError) {
        callbacks.onError(error);
      }
      throw error;
    }
  }

  // Update location during navigation
  updateLocation(newLocation) {
    if (!this.isNavigating || !this.currentRoute) return;

    this.userLocation = newLocation;
    const currentStep = this.getCurrentStep();

    if (currentStep) {
      // Check if we should advance to next step
      const distanceToManeuver = this.calculateDistance(
        newLocation,
        {
          latitude: currentStep.maneuver.location[1],
          longitude: currentStep.maneuver.location[0]
        }
      );

      if (distanceToManeuver < this.stepAdvanceThreshold) {
        this.advanceStep();
      }

      // Check if off route
      if (this.isOffRoute(newLocation)) {
        this.handleOffRoute();
      }

      // Update progress
      if (this.callbacks.onLocationUpdate) {
        this.callbacks.onLocationUpdate({
          location: newLocation,
          currentStep,
          progress: this.getProgress(),
          distanceToNext: distanceToManeuver,
          distanceToDestination: this.calculateDistance(newLocation, this.destination)
        });
      }
    }
  }

  // Check if user is off route
  isOffRoute(userLocation) {
    if (!this.currentRoute) return false;
    
    const routeCoords = this.currentRoute.geometry.coordinates;
    let minDistance = Infinity;

    // Find minimum distance to route line
    for (let i = 0; i < routeCoords.length - 1; i++) {
      const distance = this.distanceToLineSegment(
        userLocation,
        { latitude: routeCoords[i][1], longitude: routeCoords[i][0] },
        { latitude: routeCoords[i + 1][1], longitude: routeCoords[i + 1][0] }
      );
      minDistance = Math.min(minDistance, distance);
    }

    return minDistance > this.offRouteThreshold;
  }

  // Distance from point to line segment
  distanceToLineSegment(point, lineStart, lineEnd) {
    const A = point.longitude - lineStart.longitude;
    const B = point.latitude - lineStart.latitude;
    const C = lineEnd.longitude - lineStart.longitude;
    const D = lineEnd.latitude - lineStart.latitude;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) {
      return this.calculateDistance(point, lineStart);
    }

    const param = Math.max(0, Math.min(1, dot / lenSq));
    const closest = {
      longitude: lineStart.longitude + param * C,
      latitude: lineStart.latitude + param * D
    };

    return this.calculateDistance(point, closest);
  }

  // Advance to next step
  advanceStep() {
    if (this.currentStep < this.currentRoute.steps.length - 1) {
      this.currentStep++;
      if (this.callbacks.onStepAdvanced) {
        this.callbacks.onStepAdvanced(this.getCurrentStep());
      }
    } else {
      this.completeNavigation();
    }
  }

  // Handle off-route scenario
  async handleOffRoute() {
    if (this.callbacks.onOffRoute) {
      this.callbacks.onOffRoute();
    }

    // Recalculate route
    try {
      const newRoute = await this.getDetailedRoute(this.userLocation, this.destination);
      this.currentRoute = newRoute;
      this.currentStep = 0;
      
      if (this.callbacks.onRouteRecalculated) {
        this.callbacks.onRouteRecalculated(newRoute);
      }
    } catch (error) {
      console.error('Error recalculating route:', error);
    }
  }

  // Complete navigation
  completeNavigation() {
    this.isNavigating = false;
    if (this.callbacks.onNavigationCompleted) {
      this.callbacks.onNavigationCompleted();
    }
  }

  // Stop navigation
  stopNavigation() {
    this.isNavigating = false;
    this.currentRoute = null;
    this.currentStep = 0;
    if (this.callbacks.onNavigationStopped) {
      this.callbacks.onNavigationStopped();
    }
  }

  // Get current step
  getCurrentStep() {
    if (!this.currentRoute || !this.isNavigating) return null;
    return this.currentRoute.steps[this.currentStep];
  }

  // Get progress (0-1)
  getProgress() {
    if (!this.currentRoute) return 0;
    return this.currentStep / Math.max(1, this.currentRoute.steps.length - 1);
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

  // Format distance
  formatDistance(meters) {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  }

  // Format duration
  formatDuration(seconds) {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  // Get maneuver icon
  getManeuverIcon(maneuverType, modifier) {
    const icons = {
      'turn': {
        'left': '↰',
        'right': '↱',
        'slight left': '↖',
        'slight right': '↗',
        'sharp left': '↺',
        'sharp right': '↻'
      },
      'depart': '🚶‍♂️',
      'arrive': '🎯',
      'continue': '↑',
      'merge': '🔄',
      'roundabout': '🔄',
      'fork': 'Y',
      'end of road': '⤴️'
    };

    if (icons[maneuverType] && typeof icons[maneuverType] === 'object' && modifier) {
      return icons[maneuverType][modifier] || '↑';
    }
    return icons[maneuverType] || '↑';
  }
}

export const navigationService = new NavigationService();
