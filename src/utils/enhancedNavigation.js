// Enhanced navigation service with improved dynamic repositioning
export class EnhancedNavigationService {
  constructor(mapboxToken) {
    this.mapboxToken = mapboxToken;
    this.currentRoute = null;
    this.currentStep = 0;
    this.isNavigating = false;
    this.userLocation = null;
    this.destination = null;
    this.callbacks = {};
    
    // Enhanced thresholds for better wrong turn detection
    this.offRouteThreshold = 30; // meters - more sensitive
    this.stepAdvanceThreshold = 20; // meters - more responsive
    this.wrongTurnThreshold = 45; // degrees - heading deviation threshold
    this.recalculationCooldown = 3000; // ms - prevent excessive recalculations
    
    // State tracking
    this.lastRecalculation = 0;
    this.isRecalculating = false;
    this.consecutiveOffRouteCount = 0;
    this.userHeading = null;
    this.expectedHeading = null;
    this.locationHistory = [];
    this.maxLocationHistory = 10;
    
    // Performance optimization
    this.routeSegmentTree = null; // For faster distance calculations
  }

  // Enhanced route calculation with multiple fallback options
  async getDetailedRoute(start, end, profile = 'walking', alternatives = true) {
    try {
      const params = {
        geometries: 'geojson',
        steps: 'true',
        voice_instructions: 'true',
        banner_instructions: 'true',
        overview: 'full',
        alternatives: alternatives.toString(),
        continue_straight: 'false', // Allow U-turns when necessary
        access_token: this.mapboxToken
      };

      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/${profile}/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?` +
        new URLSearchParams(params)
      );

      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const processedRoute = {
          geometry: route.geometry,
          duration: route.duration,
          distance: route.distance,
          steps: this.processSteps(route.legs[0].steps),
          alternatives: data.routes.slice(1).map(r => ({
            geometry: r.geometry,
            duration: r.duration,
            distance: r.distance,
            steps: this.processSteps(r.legs[0].steps)
          }))
        };

        // Build spatial index for faster off-route detection
        this.buildRouteSegmentTree(processedRoute);
        
        return processedRoute;
      }
      
      throw new Error('No route found');
    } catch (error) {
      console.error('Error fetching route:', error);
      throw error;
    }
  }

  // Build spatial index for route segments for faster distance calculations
  buildRouteSegmentTree(route) {
    this.routeSegmentTree = [];
    const coords = route.geometry.coordinates;
    
    for (let i = 0; i < coords.length - 1; i++) {
      this.routeSegmentTree.push({
        start: { lat: coords[i][1], lng: coords[i][0] },
        end: { lat: coords[i + 1][1], lng: coords[i + 1][0] },
        index: i
      });
    }
  }

  // Enhanced location update with smarter wrong turn detection
  updateLocation(newLocation) {
    if (!this.isNavigating || !this.currentRoute) return;

    // Update location history for trend analysis
    this.locationHistory.push({
      ...newLocation,
      timestamp: Date.now()
    });
    
    if (this.locationHistory.length > this.maxLocationHistory) {
      this.locationHistory.shift();
    }

    this.userLocation = newLocation;
    this.userHeading = this.calculateUserHeading();
    
    const currentStep = this.getCurrentStep();
    if (!currentStep) return;

    // Calculate distances and positions
    const distanceToManeuver = this.calculateDistance(
      newLocation,
      {
        latitude: currentStep.maneuver.location[1],
        longitude: currentStep.maneuver.location[0]
      }
    );

    const distanceToRoute = this.getDistanceToRoute(newLocation);
    const headingDeviation = this.calculateHeadingDeviation();

    // Enhanced wrong turn detection
    const isOffRoute = this.detectWrongTurn(distanceToRoute, headingDeviation, distanceToManeuver);

    if (isOffRoute) {
      this.handleWrongTurn();
    } else {
      // Reset off-route counter if back on track
      this.consecutiveOffRouteCount = 0;

      // Check if we should advance to next step
      if (distanceToManeuver < this.stepAdvanceThreshold) {
        this.advanceStep();
      }

      // Update progress and callback
      if (this.callbacks.onLocationUpdate) {
        this.callbacks.onLocationUpdate({
          location: newLocation,
          currentStep,
          progress: this.getProgress(),
          distanceToNext: distanceToManeuver,
          distanceToDestination: this.calculateDistance(newLocation, this.destination),
          distanceToRoute: distanceToRoute,
          headingDeviation: headingDeviation,
          userHeading: this.userHeading,
          expectedHeading: this.expectedHeading
        });
      }
    }
  }

  // Calculate user heading from location history
  calculateUserHeading() {
    if (this.locationHistory.length < 2) return null;

    const recent = this.locationHistory.slice(-2);
    const [prev, curr] = recent;

    const deltaLng = curr.longitude - prev.longitude;
    const deltaLat = curr.latitude - prev.latitude;
    
    let heading = Math.atan2(deltaLng, deltaLat) * 180 / Math.PI;
    if (heading < 0) heading += 360;
    
    return heading;
  }

  // Calculate expected heading based on current route step
  calculateExpectedHeading() {
    const currentStep = this.getCurrentStep();
    if (!currentStep) return null;

    // Use the bearing after the maneuver as expected heading
    return currentStep.maneuver.bearing_after || null;
  }

  // Calculate heading deviation from expected path
  calculateHeadingDeviation() {
    if (!this.userHeading) return 0;
    
    this.expectedHeading = this.calculateExpectedHeading();
    if (!this.expectedHeading) return 0;

    let deviation = Math.abs(this.userHeading - this.expectedHeading);
    if (deviation > 180) {
      deviation = 360 - deviation;
    }
    
    return deviation;
  }

  // Enhanced wrong turn detection with multiple factors
  detectWrongTurn(distanceToRoute, headingDeviation, distanceToManeuver) {
    // Don't trigger if we're very close to the maneuver point (might be turning)
    if (distanceToManeuver < 10) return false;

    // Don't trigger too frequently
    if (this.isRecalculating || Date.now() - this.lastRecalculation < this.recalculationCooldown) {
      return false;
    }

    // Primary factor: distance to route
    const isOffRoute = distanceToRoute > this.offRouteThreshold;
    
    // Secondary factor: heading deviation
    const isWrongHeading = headingDeviation > this.wrongTurnThreshold;
    
    // Tertiary factor: trend analysis
    const isMovingAwayFromRoute = this.isMovingAwayFromRoute();

    // Require multiple consecutive off-route detections for stability
    if (isOffRoute || (isWrongHeading && isMovingAwayFromRoute)) {
      this.consecutiveOffRouteCount++;
      return this.consecutiveOffRouteCount >= 2; // Require 2 consecutive detections
    }

    return false;
  }

  // Check if user is consistently moving away from the route
  isMovingAwayFromRoute() {
    if (this.locationHistory.length < 3) return false;

    const recentDistances = this.locationHistory.slice(-3).map(loc => 
      this.getDistanceToRoute(loc)
    );

    // Check if distance is consistently increasing
    return recentDistances[2] > recentDistances[1] && recentDistances[1] > recentDistances[0];
  }

  // Get minimum distance to route using spatial index
  getDistanceToRoute(location) {
    if (!this.routeSegmentTree || this.routeSegmentTree.length === 0) {
      return this.isOffRoute(location) ? this.offRouteThreshold + 1 : 0;
    }

    let minDistance = Infinity;

    // Use spatial index for faster calculation
    for (const segment of this.routeSegmentTree) {
      const distance = this.distanceToLineSegment(
        location,
        { latitude: segment.start.lat, longitude: segment.start.lng },
        { latitude: segment.end.lat, longitude: segment.end.lng }
      );
      minDistance = Math.min(minDistance, distance);

      // Early exit if we're clearly on route
      if (minDistance < this.offRouteThreshold / 2) break;
    }

    return minDistance;
  }

  // Enhanced wrong turn handling with immediate feedback
  async handleWrongTurn() {
    console.log('🔄 Wrong turn detected - initiating dynamic repositioning');
    
    if (this.callbacks.onWrongTurn) {
      this.callbacks.onWrongTurn({
        location: this.userLocation,
        distanceFromRoute: this.getDistanceToRoute(this.userLocation),
        headingDeviation: this.calculateHeadingDeviation()
      });
    }

    // Set recalculation state
    this.isRecalculating = true;
    this.lastRecalculation = Date.now();

    if (this.callbacks.onOffRoute) {
      this.callbacks.onOffRoute();
    }

    try {
      // Fast recalculation with optimizations
      const newRoute = await this.recalculateRouteOptimized();
      
      if (newRoute) {
        this.currentRoute = newRoute;
        this.currentStep = 0; // Start from beginning of new route
        this.consecutiveOffRouteCount = 0;
        this.isRecalculating = false;
        
        // Rebuild spatial index
        this.buildRouteSegmentTree(newRoute);
        
        if (this.callbacks.onRouteRecalculated) {
          this.callbacks.onRouteRecalculated(newRoute);
        }

        console.log('✅ Route successfully recalculated');
      }
    } catch (error) {
      console.error('❌ Error recalculating route:', error);
      this.isRecalculating = false;
      
      if (this.callbacks.onRecalculationFailed) {
        this.callbacks.onRecalculationFailed(error);
      }
    }
  }

  // Optimized route recalculation with fallbacks
  async recalculateRouteOptimized() {
    const strategies = [
      // Strategy 1: Direct route with alternatives
      () => this.getDetailedRoute(this.userLocation, this.destination, 'walking', true),
      
      // Strategy 2: Conservative route (prefer main roads)
      () => this.getDetailedRoute(this.userLocation, this.destination, 'walking-main', true),
      
      // Strategy 3: Fallback to basic route without alternatives
      () => this.getDetailedRoute(this.userLocation, this.destination, 'walking', false)
    ];

    for (let i = 0; i < strategies.length; i++) {
      try {
        console.log(`🔍 Trying recalculation strategy ${i + 1}`);
        const route = await strategies[i]();
        if (route && route.steps && route.steps.length > 0) {
          return route;
        }
      } catch (error) {
        console.warn(`Strategy ${i + 1} failed:`, error);
        if (i === strategies.length - 1) throw error;
      }
    }

    throw new Error('All recalculation strategies failed');
  }

  // Enhanced step advancement with better transition handling
  advanceStep() {
    if (this.currentStep < this.currentRoute.steps.length - 1) {
      this.currentStep++;
      const newStep = this.getCurrentStep();
      
      if (this.callbacks.onStepAdvanced) {
        this.callbacks.onStepAdvanced(newStep);
      }

      // Provide audio cue for step advancement
      if (this.callbacks.onStepTransition) {
        this.callbacks.onStepTransition({
          previousStep: this.currentRoute.steps[this.currentStep - 1],
          currentStep: newStep,
          stepsRemaining: this.currentRoute.steps.length - this.currentStep - 1
        });
      }

      console.log(`📍 Advanced to step ${this.currentStep + 1}/${this.currentRoute.steps.length}: ${newStep.instruction}`);
    } else {
      this.completeNavigation();
    }
  }

  // Process steps with enhanced bearing information
  processSteps(steps) {
    return steps.map((step, index) => {
      // Calculate bearing after maneuver
      let bearingAfter = null;
      if (step.geometry && step.geometry.coordinates && step.geometry.coordinates.length >= 2) {
        const coords = step.geometry.coordinates;
        const start = coords[Math.min(1, coords.length - 1)];
        const end = coords[coords.length - 1];
        bearingAfter = this.calculateBearing(
          { lat: start[1], lng: start[0] },
          { lat: end[1], lng: end[0] }
        );
      }

      return {
        id: index,
        instruction: step.maneuver.instruction,
        distance: step.distance,
        duration: step.duration,
        geometry: step.geometry,
        maneuver: {
          type: step.maneuver.type,
          modifier: step.maneuver.modifier,
          location: step.maneuver.location,
          bearing_before: step.maneuver.bearing_before,
          bearing_after: bearingAfter || step.maneuver.bearing_after
        },
        streetName: step.name || 'Continue',
        voiceInstruction: step.voiceInstructions?.[0]?.announcement || step.maneuver.instruction
      };
    });
  }

  // Calculate bearing between two points
  calculateBearing(start, end) {
    const dLng = (end.lng - start.lng) * Math.PI / 180;
    const startLat = start.lat * Math.PI / 180;
    const endLat = end.lat * Math.PI / 180;

    const y = Math.sin(dLng) * Math.cos(endLat);
    const x = Math.cos(startLat) * Math.sin(endLat) - 
              Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  }

  // All other methods remain the same as the original NavigationService
  async startNavigation(start, destination, callbacks = {}) {
    try {
      this.userLocation = start;
      this.destination = destination;
      this.callbacks = callbacks;
      this.isNavigating = true;
      this.currentStep = 0;
      this.locationHistory = [start];

      const route = await this.getDetailedRoute(start, destination);
      this.currentRoute = route;

      if (callbacks.onRouteCalculated) {
        callbacks.onRouteCalculated(route);
      }

      console.log('🚀 Enhanced navigation started with dynamic repositioning');
      return route;
    } catch (error) {
      if (callbacks.onError) {
        callbacks.onError(error);
      }
      throw error;
    }
  }

  // Check if user is off route (legacy method for compatibility)
  isOffRoute(userLocation) {
    return this.getDistanceToRoute(userLocation) > this.offRouteThreshold;
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

  // Complete navigation
  completeNavigation() {
    this.isNavigating = false;
    console.log('🎯 Navigation completed successfully');
    if (this.callbacks.onNavigationCompleted) {
      this.callbacks.onNavigationCompleted();
    }
  }

  // Stop navigation
  stopNavigation() {
    this.isNavigating = false;
    this.currentRoute = null;
    this.currentStep = 0;
    this.locationHistory = [];
    this.routeSegmentTree = null;
    console.log('⏹️ Navigation stopped');
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

export const enhancedNavigationService = new EnhancedNavigationService();
