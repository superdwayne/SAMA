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
import { magicLink } from '../utils/magic-links';
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
    pitch: 0,
    bearing: 0
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
    // Prevent re-panning if the same pin is already selected
    if (selectedArtwork && selectedArtwork.id === location.id) {
      setSelectedArtwork(location); // Still open the popup if needed
      return;
    }
    setSelectedArtwork(location);
    console.log('[Map] Artwork popup opened', { location });

    const map = mapRef.current?.getMap?.();
    if (map) {
      const point = map.project([location.longitude, location.latitude]);
      const offsetPoint = {
        x: point.x  - -8,
        y: point.y - -15 // Move up by 10px (user's custom value)
      };
      const newCenter = map.unproject([offsetPoint.x, offsetPoint.y]);
      map.easeTo({
        center: [newCenter.lng, newCenter.lat],
        zoom: 17,
        duration: 800
      });
    } else {
      setViewport(prev => ({
        ...prev,
        latitude: location.latitude + 0.002,
        longitude: location.longitude,
        zoom: 17,
        pitch: 0,
        bearing: 0,
        transitionDuration: 800,
        transitionInterpolator: typeof window !== 'undefined' && window['mapboxgl']
          ? new window.mapboxgl.FlyToInterpolator()
          : undefined
      }));
    }

    if (location.district === 'Nieuw-West' && setUnlockedRegions && !unlockedRegions.includes('Nieuw-West')) {
      setUnlockedRegions(prev => {
        if (!prev.includes('Nieuw-West')) {
          return [...prev, 'Nieuw-West'];
        }
        return prev;
      });
    }
  };

  const handleNavigateFromPopup = () => {
    if (selectedArtwork) {
      setNavigationTarget(selectedArtwork);
      setShowNavigationPopup(true);
      setSelectedArtwork(null);
    }
  };

  const handleInAppNavigate = (artwork) => {
    console.log('[Map] handleInAppNavigate called', { artwork });
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
    console.log('[Map] Navigation started', { artwork });
    setNavigationTarget(artwork);
    
    setViewport(prev => ({
      ...prev,
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      zoom: 18,
      pitch: 0,
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
            pitch: 0
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
    console.log('[Map] Navigation stopped');
    
    setViewport(prev => ({
      ...prev,
      zoom: 12,
      pitch: 0,
      bearing: 0
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
      pitch: 0,
      bearing: 0
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
      handleNavigateToArtwork(navigationTarget);
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
      // Find the region in amsterdamRegions to get its coordinates
      const regionFeature = amsterdamRegions.features.find(
        f => f.properties.name === requestedRegion
      );
      
      if (regionFeature) {
        // Calculate center of the region polygon
        const coordinates = regionFeature.geometry.coordinates[0];
        const latSum = coordinates.reduce((sum, coord) => sum + coord[1], 0);
        const lngSum = coordinates.reduce((sum, coord) => sum + coord[0], 0);
        const centerLat = latSum / coordinates.length;
        const centerLng = lngSum / coordinates.length;
        
        // Center map on the requested region
        setViewport(prev => ({
          ...prev,
          latitude: centerLat,
          longitude: centerLng,
          zoom: 14 // Closer zoom for region focus
        }));
      }
      
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

  // Simple navigation handler
  const handleNavigateToArtwork = async (artwork) => {
    setIsNavigating(true);
    console.log('[Map] handleNavigateToArtwork called', { artwork });
    setSelectedArtwork(null);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
      });
      const coords = position.coords;
      setUserLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        timestamp: position.timestamp
      });
      // Fetch route from user location to artwork
      const currentToken = mapboxToken || MAPBOX_TOKEN;
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/walking/${coords.longitude},${coords.latitude};${artwork.longitude},${artwork.latitude}?geometries=geojson&steps=true&access_token=${currentToken}`
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
        setViewport(prev => ({
          ...prev,
          latitude: coords.latitude,
          longitude: coords.longitude,
          zoom: 18,
          pitch: 60,
          bearing: 180,
          transitionDuration: 1500,
          transitionInterpolator: typeof window !== 'undefined' && window['mapboxgl'] ? new window.mapboxgl.FlyToInterpolator() : undefined
        }));
      }
    } catch (error) {
      alert('Location access is required for navigation.');
    }
  };

  useEffect(() => {
    if (isNavigating) {
      console.log('[Map] In navigation mode');
    } else {
      console.log('[Map] Not in navigation mode');
    }
  }, [isNavigating]);

  // Default map center and zoom
  const DEFAULT_VIEWPORT = {
    latitude: 52.3676,
    longitude: 4.9041,
    zoom: 12,
    pitch: 0,
    bearing: 0
  };

  return (
    <>
      <div className={`map-container ${isNavigating ? 'navigating' : ''} ${requestedRegion ? 'region-view' : ''}`}
        style={{ position: 'relative' }}>
        {isNavigating && selectedArtwork == null && (
          <div className="navigation-back-btn-container">
            <button
              className="navigation-back-btn"
              onClick={handleStopNavigation}
              aria-label="Back"
            >
              <span className="back-arrow">←</span>
            </button>
          </div>
        )}
        {/* Only show header if not navigating and no artwork is selected */}
        {!isNavigating && selectedArtwork == null && (
          <div className="custom-mobile-header" style={{ background: '#EEFF00', padding: '20px 24px 0 24px' }}>
            <div className="header-left">
              <img src="/images/sama-logo.png" onClick={() => navigate('/')} alt="SAMA Logo" className="sama-logo" />
              <div className="header-text">
                <span className="sama-subtitle">Street Art</span>
                <span className="sama-subtitle">Museum</span>
                <span className="sama-subtitle">Amsterdam</span>
              </div>
            </div>
            {requestedRegion && (
              <div className="sama-header-stack">
                <span className="region-title-header">{requestedRegion}</span>
              </div>
            )}
          </div>
        )}

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

        {/* Welcome Tooltip */}
        {/* {showWelcome && (
          <WelcomeTooltip onClose={() => setShowWelcome(false)} />
        )} */}
        
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
        {/* {showRouteNavigator && (
          <RouteNavigator
            unlockedRegions={unlockedRegions}
            onSelectRoute={handleSelectRoute}
            onClose={() => setShowRouteNavigator(false)}
            currentLocation={userLocation}
          />
        )} */}

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
          
          {/* Remove purple overlays (region highlights/fills) */}
          {/*
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
          {requestedRegion && (
            <Source id="requested-region" type="geojson" data={{
              type: 'FeatureCollection',
              features: amsterdamRegions.features.filter(f => 
                f.properties.name === requestedRegion
              )
            }}>
              <Layer
                id="requested-region-fill"
                type="fill"
                paint={{
                  'fill-color': '#8e44ad',
                  'fill-opacity': 0.3
                }}
              />
              <Layer
                id="requested-region-outline"
                type="line"
                paint={{
                  'line-color': '#8e44ad',
                  'line-width': 3
                }}
              />
            </Source>
          )}
          */}

          {/* 3D buildings layer */}
          <Layer {...buildingLayer} />

          {/* Show only Mapbox dataset locations, filtered by region if requested */}
          {mapboxLocations
            .filter(location => {
              // If a specific region is requested, only show pins from that region
              if (requestedRegion) {
                return location.district === requestedRegion;
              }
              // Otherwise show all pins
              return true;
            })
            .map(location => {
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
                <div className={`street-art-marker ${!isUnlocked ? 'locked' : ''} ${isDestination ? 'destination' : ''} ${isRouteStop ? 'route-stop' : ''}`}>
                  {isRouteStop ? (
                    <div className="route-marker" style={{ backgroundColor: activeRoute.color }}>
                      {routeStopIndex + 1}
                    </div>
                  ) : (
                    <div className="marker-dot"></div>
                  )}
                </div>
              </Marker>
            );
          })}

          {/* Artwork Popup - Clean Full Screen Overlay with real Mapbox map */}
          {selectedArtwork && (
            <ArtworkPopup 
              artwork={selectedArtwork} 
              onClose={() => {
                setSelectedArtwork(null);
                setNavigationRoute(null); // Clear route when closing popup
                setViewport(DEFAULT_VIEWPORT); // Reset map to default view
                console.log('[Map] Artwork popup closed');
              }}
              onNavigate={handleNavigateToArtwork}
            />
          )}

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

          {/* Simple route overlay */}
          {navigationRoute && (
            <Source id="simple-route" type="geojson" data={navigationRoute}>
              <Layer
                id="simple-route-line"
                type="line"
                paint={{
                  'line-color': '#1976D2',
                  'line-width': 6,
                  'line-opacity': 0.85
                }}
              />
            </Source>
          )}
        </Map>

        {/* Active Route Panel */}
        {/* {activeRoute && (
          <ActiveRoute
            route={activeRoute}
            userLocation={userLocation}
            onNavigateToStop={handleNavigateToRouteStop}
            onEndRoute={handleEndRoute}
            onNextStop={handleNextRouteStop}
          />
        )} */}

        {/* Region info panel */}
        {/* Removed RegionInfo popup for region selection */}

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
    </>
  );
};

export default MapView;
