import React, { useState, useRef, useEffect } from 'react';
import Map, { Marker, Popup, Source, Layer, NavigationControl, GeolocateControl } from 'react-map-gl';
import { useNavigate, useSearchParams } from 'react-router-dom';
import WelcomeTooltip from './WelcomeTooltip';
import RegionInfo from './RegionInfo';
import ArtworkPopup from './ArtworkPopup';
import UnlockPrompt from './UnlockPrompt';
import NavigationPopup from './NavigationPopup';
import TokenStatus from './TokenStatus';
import EnhancedNavigation from './EnhancedNavigation';
import EnhancedRouteLayer from './EnhancedRouteLayer';
import LocationPermission from './LocationPermission';
import NavigationCompass from './NavigationCompass';
import RouteNavigator from './RouteNavigator';
import ActiveRoute from './ActiveRoute';
import MobileHeader from './MobileHeader';
import { amsterdamRegions } from '../data/regions';
import { streetArtLocations } from '../data/locations';
import { fetchMapboxDataset } from '../utils/mapboxData';
import { neighborhoodDescriptions, getNeighborhoodQRUrl } from '../data/neighborhoods';
import { artRoutes, getRouteLocations } from '../data/routes';
import { getTokenData, getRemainingDays } from '../utils/auth';
import { mapboxTokenManager } from '../utils/mapboxAuth';
import MapboxTokenSettings from './MapboxTokenSettings';
import { magicLink } from '../utils/magicLinkUtils';
import EmailMagicLink from './EmailMagicLink';
import NeighborhoodOverlay from './NeighborhoodOverlay';
import { navigationService } from '../utils/navigation';
import { locationService } from '../utils/location';
import './MapView.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1Ijoic2FtYS1tYXAiLCJhIjoiY21hanBybnhoMGliYzJrcjlwcGFlM2N0cyJ9.HmrYtyAyvmTA7pcl9hpI9A';

const MapView = ({ unlockedRegions, setUnlockedRegions }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Check if specific region is requested
  const requestedRegion = searchParams.get('region');
  
  const [viewport, setViewport] = useState({
    latitude: 52.3676,
    longitude: 4.9041,
    zoom: 12,
    pitch: 45,
    bearing: -17.6
  });
  
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);
  const [regionToUnlock, setRegionToUnlock] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [showNavigationPopup, setShowNavigationPopup] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState(null);
  const [navigationRoute, setNavigationRoute] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showTokenStatus, setShowTokenStatus] = useState(true);
  const [enhancedNavigation, setEnhancedNavigation] = useState(null);
  const [currentNavigationStep, setCurrentNavigationStep] = useState(null);
  const [showLocationPermission, setShowLocationPermission] = useState(false);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState('unknown');
  const [showRouteNavigator, setShowRouteNavigator] = useState(false);
  const [activeRoute, setActiveRoute] = useState(null);
  const [routeStops, setRouteStops] = useState([]);
  const [mapboxLocations, setMapboxLocations] = useState([]);
  const [allLocations, setAllLocations] = useState(streetArtLocations);
  const [unlockEmail, setUnlockEmail] = useState('');
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [showMapboxSettings, setShowMapboxSettings] = useState(false);
  const [mapboxToken, setMapboxToken] = useState(MAPBOX_TOKEN); // Start with hardcoded token
  const [showMagicLinkModal, setShowMagicLinkModal] = useState(false);
  const [userAccess, setUserAccess] = useState(null);
  const [magicLinkStatus, setMagicLinkStatus] = useState('idle'); // idle, verifying, success, error
  const mapRef = useRef();
  const remainingDays = getRemainingDays();

  // Initialize custom token if available on mount
  useEffect(() => {
    const customToken = mapboxTokenManager.getCustomToken();
    if (customToken) {
      setMapboxToken(customToken);
    }
  }, []);

  // NEW: Check for magic link on mount and handle verification
  useEffect(() => {
    const handleMagicLinkFlow = async () => {
      // Check for magic link in URL
      const magicToken = magicLink.checkForMagicLinkInUrl();
      
      if (magicToken) {
        setMagicLinkStatus('verifying');
        
        try {
          const result = await magicLink.verifyMagicToken(magicToken);
          
          if (result.success) {
            setMagicLinkStatus('success');
            setUserAccess(magicLink.getCurrentAccess());
            setUnlockedRegions(magicLink.getUnlockedRegions());
            
            // Show success message briefly
            setTimeout(() => {
              setMagicLinkStatus('idle');
            }, 3000);
          } else {
            setMagicLinkStatus('error');
            console.error('Magic link verification failed:', result.error);
          }
        } catch (error) {
          setMagicLinkStatus('error');
          console.error('Magic link error:', error);
        }
      } else {
        // Check for existing access
        const currentAccess = magicLink.getCurrentAccess();
        if (currentAccess) {
          setUserAccess(currentAccess);
          setUnlockedRegions(magicLink.getUnlockedRegions());
        }
      }
    };

    handleMagicLinkFlow();
  }, [setUnlockedRegions]);

  // Load Mapbox dataset on component mount
  useEffect(() => {
    const loadMapboxData = async () => {
      try {
        const mapboxData = await fetchMapboxDataset();
        setMapboxLocations(mapboxData);
        
        // Combine local data with Mapbox dataset data
        const combinedLocations = [...streetArtLocations, ...mapboxData];
        setAllLocations(combinedLocations);
        
        console.log(`✅ Loaded ${mapboxData.length} locations from Mapbox dataset`);
      } catch (error) {
        console.error('❌ Failed to load Mapbox dataset:', error);
        // Fallback to local data only
        setAllLocations(streetArtLocations);
      }
    };

    loadMapboxData();
  }, []);

  // Always unlock Nieuw-West on mount
  useEffect(() => {
    if (setUnlockedRegions && unlockedRegions && !unlockedRegions.includes('Nieuw-West')) {
      setUnlockedRegions(prev => {
        if (!prev.includes('Nieuw-West')) {
          return [...prev, 'Nieuw-West'];
        }
        return prev;
      });
    }
  }, []);

  // Enhanced location permission handling - only initialize, don't request permission
  useEffect(() => {
    const initializeLocation = async () => {
      try {
        const status = await locationService.getPermissionStatus();
        setLocationPermissionStatus(status);
        
        if (status === 'granted' && locationService.currentLocation) {
          setUserLocation(locationService.currentLocation);
          // Don't auto-center map on user location - let them explore first
        }
        // Don't show permission request automatically - wait for user to start navigation
      } catch (error) {
        console.error('Error checking location status:', error);
      }
    };

    initializeLocation();

    // Add location service callback
    const handleLocationUpdate = (event, data) => {
      if (event === 'granted' || event === 'location_update') {
        setUserLocation(data);
        setLocationPermissionStatus('granted');
        setShowLocationPermission(false);
        
        // During navigation, keep map centered on user with navigation zoom
        if (isNavigating) {
          const newBearing = data.heading !== null ? data.heading : viewport.bearing;
          setViewport(prev => ({
            ...prev,
            latitude: data.latitude,
            longitude: data.longitude,
            zoom: 18, // Close zoom for navigation
            pitch: 60, // Angled view for better navigation
            bearing: newBearing // Follow user's direction if available
          }));
        }
      } else if (event === 'error') {
        console.error('Location error:', data);
      }
    };

    locationService.addCallback(handleLocationUpdate);

    return () => {
      locationService.removeCallback(handleLocationUpdate);
    };
  }, [isNavigating]);

  // Start location tracking when navigating
  useEffect(() => {
    if (isNavigating && locationPermissionStatus === 'granted') {
      locationService.startWatching({ enableHighAccuracy: true });
    } else if (!isNavigating) {
      locationService.stopWatching();
    }
    
    return () => {
      if (!isNavigating) {
        locationService.stopWatching();
      }
    };
  }, [isNavigating, locationPermissionStatus]);

  // Handle magic link success
  const handleMagicLinkSuccess = () => {
    const access = magicLink.getCurrentAccess();
    setUserAccess(access);
    setUnlockedRegions(magicLink.getUnlockedRegions());
    setShowMagicLinkModal(false);
  };

  // Handle logout
  const handleLogout = () => {
    magicLink.clearAccess();
    setUserAccess(null);
    setUnlockedRegions(['East']); // Reset to free region only
  };

  // Fetch route from Mapbox Directions API
  const fetchRoute = async (start, end) => {
    try {
      const currentToken = mapboxToken || MAPBOX_TOKEN;
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/walking/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?geometries=geojson&steps=true&access_token=${currentToken}`
      );
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        setNavigationRoute({
          type: 'Feature',
          properties: {
            distance: route.distance,
            duration: route.duration
          },
          geometry: route.geometry
        });
        
        // Fit map to show the route
        const coordinates = route.geometry.coordinates;
        const bounds = coordinates.reduce((bounds, coord) => {
          return bounds.extend(coord);
        }, new window.mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
        
        mapRef.current?.fitBounds(bounds, {
          padding: { top: 100, bottom: 100, left: 100, right: 100 }
        });
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };

  // ... (all the handler functions remain the same)
  const handleRegionClick = (region) => {
    setSelectedRegion(region);
    if (!unlockedRegions.includes(region.name)) {
      setRegionToUnlock(region);
      setShowUnlockPrompt(true);
    }
  };

  const handleUnlockRegion = (region) => {
    setRegionToUnlock(region);
    setShowUnlockPrompt(true);
  };

  const handleArtworkClick = (location) => {
    console.log('Clicked location:', location);
    if (location.district === 'Nieuw-West' && setUnlockedRegions && !unlockedRegions.includes('Nieuw-West')) {
      setUnlockedRegions(prev => {
        if (!prev.includes('Nieuw-West')) {
          return [...prev, 'Nieuw-West'];
        }
        return prev;
      });
    }
    const isUnlocked = unlockedRegions.includes(location.district) || location.district === 'Nieuw-West';
    if (isUnlocked) {
      setSelectedArtwork(location);
      setNavigationTarget(location);
      setShowNavigationPopup(true);
    } else {
      const region = amsterdamRegions.features.find(
        f => f.properties.name === location.district
      );
      if (region) {
        setRegionToUnlock(region.properties);
        setShowUnlockPrompt(true);
      }
    }
  };

  const handleInAppNavigate = (artwork) => {
    // Only request location when user actually wants to navigate
    if (locationPermissionStatus !== 'granted') {
      setShowLocationPermission(true);
      // Store the target so we can navigate after permission is granted
      setNavigationTarget(artwork);
      return;
    }

    if (!userLocation) {
      setShowLocationPermission(true);
      setNavigationTarget(artwork);
      return;
    }

    setIsNavigating(true);
    setNavigationTarget(artwork);
    
    setViewport(prev => ({
      ...prev,
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      zoom: 18,
      pitch: 60,
      bearing: 0
    }));
    
    setEnhancedNavigation({
      userLocation,
      destination: artwork,
      onRouteCalculated: (route) => {
        setNavigationRoute(route);
        setTimeout(() => {
          setViewport(prev => ({
            ...prev,
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            zoom: 18,
            pitch: 60
          }));
        }, 3000);
      },
      onStepAdvanced: (step) => {
        setCurrentNavigationStep(step);
      }
    });
  };

  const handleStopNavigation = () => {
    setIsNavigating(false);
    setNavigationRoute(null);
    setNavigationTarget(null);
    setEnhancedNavigation(null);
    setCurrentNavigationStep(null);
    locationService.stopWatching();
    
    setViewport(prev => ({
      ...prev,
      zoom: 12,
      pitch: 45,
      bearing: -17.6
    }));
  };

  const handleSelectRoute = (route) => {
    setActiveRoute(route);
    const routeLocations = getRouteLocations(route.id, allLocations);
    setRouteStops(routeLocations);
    
    if (routeLocations.length > 0 && mapRef.current) {
      const bounds = routeLocations.reduce((bounds, location) => {
        return bounds.extend([location.longitude, location.latitude]);
      }, new window.mapboxgl.LngLatBounds());
      
      mapRef.current.fitBounds(bounds, {
        padding: { top: 100, bottom: 100, left: 100, right: 100 }
      });
    }
  };

  const handleEndRoute = () => {
    setActiveRoute(null);
    setRouteStops([]);
    
    setViewport(prev => ({
      ...prev,
      zoom: 12,
      pitch: 45,
      bearing: -17.6
    }));
  };

  const handleNavigateToRouteStop = (stop) => {
    // Only request location when user actually wants to navigate
    if (locationPermissionStatus !== 'granted') {
      setShowLocationPermission(true);
      setNavigationTarget(stop);
      return;
    }
    
    handleInAppNavigate(stop);
  };

  const handleNextRouteStop = (nextStop) => {
    setViewport(prev => ({
      ...prev,
      latitude: nextStop.latitude,
      longitude: nextStop.longitude,
      zoom: 16
    }));
  };

  const handleLocationGranted = (location) => {
    setUserLocation(location);
    setLocationPermissionStatus('granted');
    setShowLocationPermission(false);
    
    // If we have a pending navigation target, start navigating now
    if (navigationTarget && !isNavigating) {
      handleInAppNavigate(navigationTarget);
    }
  };

  const handleLocationDenied = (error) => {
    setLocationPermissionStatus('denied');
    console.error('Location permission denied:', error);
  };

  const getRegionLayer = (isUnlocked) => ({
    id: isUnlocked ? 'regions-unlocked' : 'regions-locked',
    type: 'fill',
    paint: {
      'fill-color': isUnlocked ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.3)',
      'fill-outline-color': isUnlocked ? '#4CAF50' : '#f44336'
    }
  });

  const getRegionBorderLayer = (isUnlocked) => ({
    id: isUnlocked ? 'regions-border-unlocked' : 'regions-border-locked',
    type: 'line',
    paint: {
      'line-color': isUnlocked ? '#4CAF50' : '#f44336',
      'line-width': 2,
      'line-dasharray': isUnlocked ? [1] : [2, 2]
    }
  });

  // 3D building layer
  const buildingLayer = {
    id: '3d-buildings',
    source: 'composite',
    'source-layer': 'building',
    filter: ['==', 'extrude', 'true'],
    type: 'fill-extrusion',
    minzoom: 15,
    paint: {
      'fill-extrusion-color': '#aaa',
      'fill-extrusion-height': [
        'interpolate',
        ['linear'],
        ['zoom'],
        15,
        0,
        15.05,
        ['get', 'height']
      ],
      'fill-extrusion-base': [
        'interpolate',
        ['linear'],
        ['zoom'],
        15,
        0,
        15.05,
        ['get', 'min_height']
      ],
      'fill-extrusion-opacity': 0.6
    }
  };

  useEffect(() => {
    if (userLocation && isNavigating) {
      const newBearing =
        userLocation.heading !== null && userLocation.heading !== undefined
          ? userLocation.heading
          : currentNavigationStep?.maneuver?.bearing_after || viewport.bearing;

      setViewport(prev => ({
        ...prev,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        bearing: newBearing,
        zoom: 18,
        pitch: 60
      }));
    }
  }, [userLocation, isNavigating, currentNavigationStep]);

  useEffect(() => {
    if (requestedRegion) {
      // Unlock the region if not already unlocked
      if (setUnlockedRegions && unlockedRegions && !unlockedRegions.includes(requestedRegion)) {
        setUnlockedRegions(prev => {
          if (!prev.includes(requestedRegion)) {
            return [...prev, requestedRegion];
          }
          return prev;
        });
      }
      // If Nieuw-West, show the Emerging Artists Trail route
      if (requestedRegion === 'Nieuw-West') {
        const emergingRoute = artRoutes.find(r => r.id === 'emerging-artists');
        if (emergingRoute) {
          setActiveRoute(emergingRoute);
          const routeLocations = getRouteLocations(emergingRoute.id, allLocations);
          setRouteStops(routeLocations);
          // Center map on Nieuw-West
          setViewport(prev => ({
            ...prev,
            latitude: 52.3700,
            longitude: 4.8100,
            zoom: 13
          }));
        }
      }
    }
    // eslint-disable-next-line
  }, [requestedRegion, allLocations]);

  return (
    <div className={`map-container ${isNavigating ? 'navigating' : ''}`}>
      {/* Mobile Header */}
      <MobileHeader 
        userAccess={userAccess}
        unlockedRegions={unlockedRegions}
        onShowMagicLink={() => setShowMagicLinkModal(true)}
        onShowMapboxSettings={() => setShowMapboxSettings(true)}
        onLogout={handleLogout}
        onShowRouteNavigator={() => setShowRouteNavigator(true)}
        isNavigating={isNavigating}
        navigationTarget={navigationTarget}
        onStopNavigation={handleStopNavigation}
      />

      {/* Magic Link Status Overlay */}
      {magicLinkStatus === 'verifying' && (
        <div className="magic-link-status verifying">
          <div className="status-content">
            <div className="loading-spinner"></div>
            <h3>🔐 Verifying Your Access...</h3>
            <p>Please wait while we check your magic link.</p>
          </div>
        </div>
      )}

      {magicLinkStatus === 'success' && (
        <div className="magic-link-status success">
          <div className="status-content">
            <div className="success-icon">🎉</div>
            <h3>Welcome to Amsterdam Street Art Map!</h3>
            <p>Your access has been activated successfully.</p>
            {userAccess?.hasPurchased && (
              <div className="premium-notice">
                ✨ You have premium access to all regions!
              </div>
            )}
          </div>
        </div>
      )}

      {magicLinkStatus === 'error' && (
        <div className="magic-link-status error">
          <div className="status-content">
            <div className="error-icon">❌</div>
            <h3>Access Link Invalid</h3>
            <p>Your magic link has expired or is invalid.</p>
            <button 
              onClick={() => {
                setMagicLinkStatus('idle');
                setShowMagicLinkModal(true);
              }}
              className="retry-button"
            >
              Request New Link
            </button>
          </div>
        </div>
      )}
      {/* Token status alert */}
      {showTokenStatus && remainingDays <= 7 && remainingDays > 0 && (
        <TokenStatus 
          onRenew={() => navigate('/token')}
        />
      )}

      {showWelcome && (
        <WelcomeTooltip onClose={() => setShowWelcome(false)} />
      )}
      
      {showUnlockPrompt && regionToUnlock && (
        <UnlockPrompt 
          region={regionToUnlock}
          onUnlock={() => handleUnlockRegion(regionToUnlock)}
          onClose={() => {
            setShowUnlockPrompt(false);
            setRegionToUnlock(null);
          }}
        />
      )}

      {showNavigationPopup && navigationTarget && (
        <NavigationPopup
          artwork={navigationTarget}
          userLocation={userLocation}
          onInAppNavigate={handleInAppNavigate}
          onClose={() => {
            setShowNavigationPopup(false);
            setNavigationTarget(null);
          }}
        />
      )}

      {/* Route Navigator */}
      {showRouteNavigator && (
        <RouteNavigator
          unlockedRegions={unlockedRegions}
          onSelectRoute={handleSelectRoute}
          onClose={() => setShowRouteNavigator(false)}
          currentLocation={userLocation}
        />
      )}

      {/* Map header with title */}
      <div className="map-header">
        <h1 className="map-title">Amsterdam Street Art Map</h1>
        
        <div className="header-controls">
          <button 
            className="mapbox-settings-button"
            onClick={() => setShowMapboxSettings(true)}
            title="Mapbox Token Settings"
            style={{
              padding: '8px 12px',
              marginRight: '12px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            🗺️ Map Settings
          </button>
          
          {userAccess ? (
            <div className="user-status">
              <span className="user-email">{userAccess.email}</span>
              <span className="access-info">
                {userAccess.hasPurchased ? 'Premium Access' : 'Free Access'} • 
                {magicLink.getRemainingDays()} days left
              </span>
              <button onClick={handleLogout} className="logout-button">
                Logout
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowMagicLinkModal(true)}
              className="magic-link-button"
            >
              📧 Email Me My Magic Link
            </button>
          )}
        </div>
      </div>
      
      {/* Navigation controls */}
      {isNavigating && navigationTarget && (
        <div className="navigation-bar">
          <div className="navigation-info">
            <h3>Navigating to {navigationTarget.title}</h3>
            {navigationRoute && (
              <p>
                {(navigationRoute.properties.distance / 1000).toFixed(1)}km • 
                {Math.round(navigationRoute.properties.duration / 60)} min
              </p>
            )}
          </div>
          <button className="stop-navigation-button" onClick={handleStopNavigation}>
            ✕ Stop Navigation
          </button>
        </div>
      )}
      
      <Map
        ref={mapRef}
        {...viewport}
        mapboxAccessToken={mapboxToken}
        onMove={evt => setViewport(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/light-v11"
        interactiveLayerIds={['sama-map-regions-fill', 'sama-map-regions-outline']}
        onClick={(event) => {
          const features = event.features;
          if (features && features.length > 0) {
            const regionFeature = features.find(f =>
              f.layer.id === 'sama-map-regions-fill' || f.layer.id === 'sama-map-regions-outline'
            );
            if (regionFeature) {
              setSelectedRegion(regionFeature.properties);
              return;
            }

            const pinFeature = features.find(f =>
              f.layer['source-layer'] === 'NW-Artwork-Pins-2hom5o'
            );
            if (pinFeature) {
              return;
            }

            const feature = features[0];
            if (feature.layer.id.includes('regions')) {
              const region = amsterdamRegions.features.find(
                r => r.properties.name === feature.properties.name
              );
              if (region) handleRegionClick(region.properties);
            }
          }
        }}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl 
          position="top-right"
          trackUserLocation
          showUserHeading
        />
        
        <Source id="regions-unlocked" type="geojson" data={{
          type: 'FeatureCollection',
          features: amsterdamRegions.features.filter(f => 
            unlockedRegions.includes(f.properties.name)
          )
        }}>
        </Source>
        
        <Source id="regions-locked" type="geojson" data={{
          type: 'FeatureCollection',
          features: amsterdamRegions.features.filter(f => 
            !unlockedRegions.includes(f.properties.name)
          )
        }}>
        </Source>

        {/* Enhanced Route Layer */}
        {navigationRoute && (
          <EnhancedRouteLayer
            route={navigationRoute}
            currentStep={currentNavigationStep}
            userLocation={userLocation}
            isNavigating={isNavigating}
          />
        )}

        {/* 3D buildings layer */}
        <Layer {...buildingLayer} />

        {/* Show all locations from both local data and Mapbox dataset */}
        {allLocations.map(location => {
          const isUnlocked = unlockedRegions.includes(location.district);
          const isDestination = navigationTarget?.id === location.id;
          const isRouteStop = activeRoute && routeStops.some(stop => stop.id === location.id);
          const routeStopIndex = isRouteStop ? routeStops.findIndex(stop => stop.id === location.id) : -1;
          
          return (
            <Marker
              key={`marker-${location.id}-${location.latitude}-${location.longitude}`}
              longitude={location.longitude}
              latitude={location.latitude}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                handleArtworkClick(location);
              }}
            >
              <div className={`marker ${!isUnlocked ? 'locked' : ''} ${isDestination ? 'destination' : ''} ${isRouteStop ? 'route-stop' : ''}`}>
                <div className="marker-content">
                  {isRouteStop ? (
                    <div className="route-marker" style={{ backgroundColor: activeRoute.color }}>
                      {routeStopIndex + 1}
                    </div>
                  ) : (
                    location.type === 'gallery' ? '🏛️' : 
                    location.type === 'legal-wall' ? '🎨' : 
                    location.type === 'artwork' ? '🖼️' : 
                    location.type === 'museum' ? '🏛️' : '📍'
                  )}
                </div>
              </div>
            </Marker>
          );
        })}

        {/* User location marker */}
        {userLocation && (
          <Marker
            longitude={userLocation.longitude}
            latitude={userLocation.latitude}
          >
            <div className="user-location-marker">
              <div className="user-location-dot"></div>
              <div className="user-location-pulse"></div>
            </div>
          </Marker>
        )}

        <Source
          id="sama-map-regions"
          type="vector"
          url="mapbox://sama-map.3bcb314w"
        >
          <Layer
            id="sama-map-regions-fill"
            type="fill"
            source="sama-map-regions"
            source-layer="tilebox_grenzen-8u5o1t"
            paint={{
              'fill-color': '#8e44ad',
              'fill-opacity': 0.3
            }}
          />
          <Layer
            id="sama-map-regions-outline"
            type="line"
            source="sama-map-regions"
            source-layer="tilebox_grenzen-8u5o1t"
            paint={{
              'line-color': '#8e44ad',
              'line-width': 2
            }}
          />
          <Layer
            id="sama-map-regions-labels"
            type="symbol"
            source="sama-map-regions"
            source-layer="tilebox_grenzen-8u5o1t"
            layout={{
              'text-field': ['get', 'name'],
              'text-size': 14,
              'text-offset': [0, 1.2],
              'text-anchor': 'top'
            }}
            paint={{
              'text-color': '#8e44ad',
              'text-halo-color': '#fff',
              'text-halo-width': 1.5
            }}
          />
        </Source>

        <Source
          id="nw-pins"
          type="vector"
          url="mapbox://sama-map.cmcdau2ox10ct1npijaxk0i7m-9z3su"
        >
          <Layer
            id="nw-pins-layer"
            type="circle"
            source="nw-pins"
            source-layer="NW-Pins"
            paint={{
              'circle-radius': 7,
              'circle-color': '#e74c3c',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#fff'
            }}
          />
        </Source>
      </Map>

      {/* Active Route Panel */}
      {activeRoute && (
        <ActiveRoute
          route={activeRoute}
          userLocation={userLocation}
          onNavigateToStop={handleNavigateToRouteStop}
          onEndRoute={handleEndRoute}
          onNextStop={handleNextRouteStop}
        />
      )}

      {/* Region info panel */}
      {selectedRegion && !showUnlockPrompt && (
        <RegionInfo 
          region={selectedRegion} 
          onClose={() => setSelectedRegion(null)}
          isUnlocked={unlockedRegions.includes(selectedRegion.name || selectedRegion.Naam || selectedRegion.name_en)}
          onUnlock={() => handleUnlockRegion(selectedRegion)}
        />
      )}

      {/* Enhanced Navigation */}
      {enhancedNavigation && (
        <EnhancedNavigation
          userLocation={enhancedNavigation.userLocation}
          destination={enhancedNavigation.destination}
          onNavigationEnd={handleStopNavigation}
          mapRef={mapRef}
          mapboxToken={mapboxToken}
          onRouteCalculated={enhancedNavigation.onRouteCalculated}
          onStepAdvanced={enhancedNavigation.onStepAdvanced}
          viewport={viewport}
        />
      )}

      {/* Location Permission */}
      {showLocationPermission && (
        <LocationPermission
          onLocationGranted={handleLocationGranted}
          onLocationDenied={handleLocationDenied}
          showAlways={false}
        />
      )}

      {/* Navigation Compass */}
      {isNavigating && userLocation && (
        <NavigationCompass
          bearing={userLocation.heading || viewport.bearing}
          nextTurnBearing={currentNavigationStep?.maneuver?.bearing_after}
          nextTurnDirection={
            currentNavigationStep?.maneuver?.modifier?.includes('left') ? 'left' :
            currentNavigationStep?.maneuver?.modifier?.includes('right') ? 'right' :
            currentNavigationStep?.maneuver?.type === 'continue' ? 'straight' : null
          }
        />
      )}

      {/* Mapbox Token Settings Modal */}
      {showMapboxSettings && (
        <MapboxTokenSettings
          onTokenUpdate={(newToken) => {
            setMapboxToken(newToken || MAPBOX_TOKEN);
          }}
          onClose={() => setShowMapboxSettings(false)}
        />
      )}

      {/* Magic Link Modal */}
      {showMagicLinkModal && (
        <EmailMagicLink
          onSuccess={handleMagicLinkSuccess}
          onClose={() => setShowMagicLinkModal(false)}
        />
      )}
    </div>
  );
};

export default MapView;
