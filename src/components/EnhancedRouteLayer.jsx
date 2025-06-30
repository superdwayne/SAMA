import React from 'react';
import { Source, Layer } from 'react-map-gl';

const EnhancedRouteLayer = ({ route, currentStep, userLocation, isNavigating }) => {
  if (!route || !route.geometry) return null;

  // Create route layers
  const routeLayer = {
    id: 'navigation-route',
    type: 'line',
    paint: {
      'line-color': '#667eea',
      'line-width': 8,
      'line-opacity': 0.8
    },
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    }
  };

  // Route outline for better visibility
  const routeOutlineLayer = {
    id: 'navigation-route-outline',
    type: 'line',
    paint: {
      'line-color': '#000',
      'line-width': 12,
      'line-opacity': 0.3
    },
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    }
  };

  // Animated route layer for active navigation
  const animatedRouteLayer = {
    id: 'navigation-route-animated',
    type: 'line',
    paint: {
      'line-color': '#FFFF00',
      'line-width': 4,
      'line-opacity': 0.7,
      'line-dasharray': [2, 2]
    },
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    }
  };

  // Create maneuver points
  const maneuverPoints = route.steps?.map((step, index) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: step.maneuver.location
    },
    properties: {
      stepIndex: index,
      instruction: step.instruction,
      maneuverType: step.maneuver.type,
      modifier: step.maneuver.modifier,
      isCurrent: currentStep && step.id === currentStep.id,
      isPassed: currentStep && step.id < currentStep.id
    }
  })) || [];

  const maneuverLayer = {
    id: 'navigation-maneuvers',
    type: 'circle',
    paint: {
      'circle-radius': [
        'case',
        ['get', 'isCurrent'], 12,
        ['get', 'isPassed'], 8,
        10
      ],
      'circle-color': [
        'case',
        ['get', 'isCurrent'], '#FFFF00',
        ['get', 'isPassed'], '#28a745',
        '#667eea'
      ],
      'circle-stroke-width': 3,
      'circle-stroke-color': '#000',
      'circle-opacity': 0.9
    }
  };

  // Create progress indicator (traveled portion)
  const createProgressRoute = () => {
    if (!currentStep || !route.steps) return null;

    const currentStepIndex = route.steps.findIndex(step => step.id === currentStep.id);
    if (currentStepIndex === -1) return null;

    // Get coordinates up to current step
    const allCoords = route.geometry.coordinates;
    const currentStepCoords = currentStep.maneuver.location;
    
    // Find the closest coordinate index to current step
    let closestIndex = 0;
    let minDistance = Infinity;
    
    allCoords.forEach((coord, index) => {
      const distance = Math.sqrt(
        Math.pow(coord[0] - currentStepCoords[0], 2) +
        Math.pow(coord[1] - currentStepCoords[1], 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: allCoords.slice(0, closestIndex + 1)
      }
    };
  };

  const progressRoute = createProgressRoute();

  const progressLayer = {
    id: 'navigation-progress',
    type: 'line',
    paint: {
      'line-color': '#28a745',
      'line-width': 6,
      'line-opacity': 0.9
    },
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    }
  };

  return (
    <>
      {/* Route outline */}
      <Source id="route-outline" type="geojson" data={route}>
        <Layer {...routeOutlineLayer} />
      </Source>

      {/* Main route */}
      <Source id="route" type="geojson" data={route}>
        <Layer {...routeLayer} />
      </Source>

      {/* Animated route for active navigation */}
      {isNavigating && (
        <Source id="route-animated" type="geojson" data={route}>
          <Layer {...animatedRouteLayer} />
        </Source>
      )}

      {/* Progress indicator */}
      {progressRoute && (
        <Source id="route-progress" type="geojson" data={progressRoute}>
          <Layer {...progressLayer} />
        </Source>
      )}

      {/* Maneuver points */}
      {maneuverPoints.length > 0 && (
        <Source 
          id="maneuvers" 
          type="geojson" 
          data={{
            type: 'FeatureCollection',
            features: maneuverPoints
          }}
        >
          <Layer {...maneuverLayer} />
        </Source>
      )}
    </>
  );
};

export default EnhancedRouteLayer;
