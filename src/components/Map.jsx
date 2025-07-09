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
import SmartNavigation from './SmartNavigation';
import { enhancedNavigationService } from '../utils/enhancedNavigation';
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
  const [showWelcome, setShowWelcome] = useState(false);
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

  // Debug: Log current unlocked regions
  useEffect(() => {
    console.log('🔓 Current unlocked regions:', unlockedRegions);
  }, [unlockedRegions]);

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
            const newAccess = magicLink.getCurrentAccess();
            const newUnlockedRegions = magicLink.getUnlockedRegions();
            console.log('🎉 Magic link success!', { 
              access: newAccess, 
              unlockedRegions: newUnlockedRegions 
            });
            setUserAccess(newAccess);
            setUnlockedRegions(newUnlockedRegions);
            
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
        // If specific region is requested, fetch that region's dataset first
        // Handle region name variations (Centre, Center, Centrum)
        let targetRegion = requestedRegion;
        if (requestedRegion === 'Centre' || requestedRegion === 'Center') {
          targetRegion = 'Centrum'; // Use the actual dataset region name
        }
        
        const mapboxData = requestedRegion 
          ? await fetchMapboxDataset(targetRegion)
          : await fetchMapboxDataset();
        
        setMapboxLocations(mapboxData);
        
        // Combine local data with Mapbox dataset data
        const combinedLocations = [...streetArtLocations, ...mapboxData];
        setAllLocations(combinedLocations);
        
        console.log(`✅ Loaded ${mapboxData.length} locations from Mapbox dataset`);
        console.log('🎯 Target region:', requestedRegion || 'All regions');
      } catch (error) {
        console.error('❌ Failed to load Mapbox dataset:', error);
        // Fallback to local data only
        setAllLocations(streetArtLocations);
      }
    };

    loadMapboxData();
  }, [requestedRegion]); // Re-fetch when requested region changes

  // Remove auto-unlock - only unlock purchased regions
  // useEffect(() => {
  //   if (setUnlockedRegions && unlockedRegions && !unlockedRegions.includes('Nieuw-West')) {
  //     setUnlockedRegions(prev => {
  //       if (!prev.includes('Nieuw-West')) {
  //         return [...prev, 'Nieuw-West'];
  //       }
  //       return prev;
  //     });
  //   }
  // }, []);

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

    // Listen for custom location permission requests
    const handleLocationPermissionRequest = () => {
      setShowLocationPermission(true);
    };

    window.addEventListener('requestLocationPermission', handleLocationPermissionRequest);

    return () => {
      window.removeEventListener('requestLocationPermission', handleLocationPermissionRequest);
    };

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
    const newUnlockedRegions = magicLink.getUnlockedRegions();
    console.log('🔓 Magic link success - updating regions:', { 
      access, 
      newUnlockedRegions,
      currentUnlocked: unlockedRegions 
    });
    setUserAccess(access);
    setUnlockedRegions(newUnlockedRegions);
    setShowMagicLinkModal(false);
  };

  // Handle logout
  const handleLogout = () => {
    magicLink.clearAccess();
    setUserAccess(null);
    setUnlockedRegions([]); // Reset to no regions - everything locked
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

    // Remove auto-unlock - only show purchased regions
    // if (location.district === 'Nieuw-West' && setUnlockedRegions && !unlockedRegions.includes('Nieuw-West')) {
    //   setUnlockedRegions(prev => {
    //     if (!prev.includes('Nieuw-West')) {
    //       return [...prev, 'Nieuw-West'];
    //     }
    //     return prev;
    //   });
    // }
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
    console.log('[Map] Enhanced Navigation started', { artwork });
    setNavigationTarget(artwork);
    
    setViewport(prev => ({
      ...prev,
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      zoom: 18,
      pitch: 0,
      bearing: 0
    }));
    
    // Use enhanced navigation service
    setEnhancedNavigation({
      userLocation,
      destination: artwork,
      onRouteCalculated: (route) => {
        setNavigationRoute(route);
        console.log('🗺️ Enhanced route calculated:', route);
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
        console.log('📍 Navigation step advanced:', step);
      }
    });
  };

  const handleStopNavigation = () => {
    setIsNavigating(false);
    setNavigationRoute(null);
    setNavigationTarget(null);
    setEnhancedNavigation(null);
    setCurrentNavigationStep(null);
    
    // Stop enhanced navigation service
    enhancedNavigationService.stopNavigation();
    locationService.stopWatching();
    
    console.log('[Map] Enhanced Navigation stopped');
    
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
    setShowLocationPermission(false);
    setNavigationTarget(null); // Clear any pending navigation
    console.log('Location permission denied or skipped:', error);
    
    // Show a helpful message if user skipped
    if (error?.message === 'User skipped location') {
      console.log('User chose to skip navigation - they can still browse the map');
    }
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

  // Simple navigation handler with fallback for iOS CoreLocation issues
  const handleNavigateToArtwork = async (artwork) => {
    console.log('[Map] 🚀 Starting navigation to:', artwork.title);
    setIsNavigating(true);
    setSelectedArtwork(null);
    
    try {
      console.log('[Map] 📍 Requesting location permission...');
      
      // Try high accuracy first, then fallback to network-based location
      let position;
      try {
        position = await new Promise((resolve, reject) => {
          const options = {
            enableHighAccuracy: true,
            timeout: 15000, // 15 seconds timeout
            maximumAge: 300000 // Accept cached position up to 5 minutes old
          };
          
          navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });
      } catch (highAccuracyError) {
        console.log('[Map] 🔄 High accuracy failed, trying network-based location...');
        
        // Fallback: Try with less strict options
        position = await new Promise((resolve, reject) => {
          const fallbackOptions = {
            enableHighAccuracy: false, // Use network-based location
            timeout: 10000, // Shorter timeout
            maximumAge: 600000 // Accept older cached position (10 minutes)
          };
          
          navigator.geolocation.getCurrentPosition(resolve, reject, fallbackOptions);
        });
      }
      
      console.log('[Map] ✅ Location obtained:', position.coords);
      const coords = position.coords;
      setUserLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        timestamp: position.timestamp
      });
      
      // Fetch route from user location to artwork
      console.log('[Map] 🗺️ Fetching route...');
      const currentToken = mapboxToken || MAPBOX_TOKEN;
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/walking/${coords.longitude},${coords.latitude};${artwork.longitude},${artwork.latitude}?geometries=geojson&steps=true&access_token=${currentToken}`
      );
      
      const data = await response.json();
      console.log('[Map] 📊 Route response:', data);
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        console.log('[Map] ✅ Route found! Distance:', route.distance, 'Duration:', route.duration);
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
        
        console.log('[Map] 🎯 Navigation active!');
      } else {
        console.log('[Map] ❌ No route found in response');
        setIsNavigating(false);
      }
    } catch (error) {
      console.log('[Map] ❌ Navigation failed:', error.code, error.message);
      
      // Handle different types of location errors
      if (error.code === 1) {
        // Permission denied
        console.log('[Map] 🚫 Location permission denied by user');
        setShowLocationPermission(true);
        setNavigationTarget(artwork);
      } else if (error.code === 2) {
        // Position unavailable (includes kCLErrorLocationUnknown)
        console.log('[Map] 📡 Position unavailable - GPS/location services issue:', error.message);
        
        // More specific guidance for CoreLocation errors
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const iosGuidance = isIOS ? 
          '\n• Go to Settings > Privacy & Security > Location Services\n• Enable Location Services for your browser (Safari/Chrome)\n• Try switching between WiFi and cellular data' : 
          '';
        
        alert(`📍 Unable to determine your location. This often happens when:\n\n• You're indoors or underground (GPS signal blocked)\n• Location Services are disabled${iosGuidance}\n• Your device has poor GPS reception\n\n💡 Try:\n• Moving outdoors for better GPS signal\n• Refreshing the page\n• Checking your device's location settings\n\nYou can still view artwork locations and get directions using other map apps!`);
      } else if (error.code === 3) {
        // Timeout
        console.log('[Map] ⏰ Location request timed out');
        alert(`⏰ Location request timed out. Please:\n\n• Try again in a moment\n• Check your GPS signal\n• Make sure Location Services are enabled\n\nYou can still view the artwork location on the map!`);
      } else {
        console.log('[Map] ❓ Unknown location error');
        setShowLocationPermission(true);
        setNavigationTarget(artwork);
      }
      
      setIsNavigating(false);
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
              <span className="back-arrow">
                <img src="/images/back.png" alt="Back" className="back-arrow-img" />
              </span>
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

          {/* Show only Mapbox dataset locations, filtered by unlocked regions */}
          {mapboxLocations
            .filter(location => {
              // Debug: Log location details
             // console.log(`🔍 Checking location: "${location.title}" - district: "${location.district}" - requestedRegion: "${requestedRegion}"`);
              
              // If a specific region is requested, only show pins from that region
              if (requestedRegion) {
                // More flexible region matching
                const locationRegion = location.district;
                const regionMatches = 
                  locationRegion === requestedRegion ||
                  locationRegion.toLowerCase() === requestedRegion.toLowerCase() ||
                  // Handle Center/Centre/Centrum variations
                  (requestedRegion === 'Centre' && (locationRegion === 'Center' || locationRegion === 'centre' || locationRegion === 'Centrum')) ||
                  (requestedRegion === 'Center' && (locationRegion === 'Centre' || locationRegion === 'center' || locationRegion === 'Centrum')) ||
                  (requestedRegion === 'Centrum' && (locationRegion === 'Centre' || locationRegion === 'Center' || locationRegion === 'center' || locationRegion === 'centre'));
                
               // console.log(`📍 Region match check: "${locationRegion}" vs "${requestedRegion}" = ${regionMatches}`);
                return regionMatches;
              }
              
              // Otherwise, only show pins from unlocked regions
              const isUnlocked = unlockedRegions.some(unlockedRegion => {
                // Case-insensitive matching for region names
                const normalizedUnlocked = unlockedRegion.toLowerCase().replace(/[^a-z]/g, '');
                const normalizedDistrict = location.district.toLowerCase().replace(/[^a-z]/g, '');
                return normalizedUnlocked === normalizedDistrict || 
                       // Handle Center/Centre/Centrum variations
                       (normalizedUnlocked === 'center' && (normalizedDistrict === 'centre' || normalizedDistrict === 'centrum')) ||
                       (normalizedUnlocked === 'centre' && (normalizedDistrict === 'center' || normalizedDistrict === 'centrum')) ||
                       (normalizedUnlocked === 'centrum' && (normalizedDistrict === 'center' || normalizedDistrict === 'centre'));
              });
              console.log(`📍 Pin "${location.title}" in district "${location.district}": ${isUnlocked ? 'SHOW' : 'HIDE'} (unlocked: ${unlockedRegions.join(', ')})`);
              return isUnlocked;
            })
            .map(location => {
            const isUnlocked = unlockedRegions.includes(location.district);
            const isDestination = navigationTarget?.id === location.id;
            const isRouteStop = activeRoute && routeStops.some(stop => stop.id === location.id);
            const routeStopIndex = isRouteStop ? routeStops.findIndex(stop => stop.id === location.id) : -1;
            
            // Determine marker icon based on type
            const getMarkerIcon = (type) => {
              switch(type?.toLowerCase()) {
                case 'mural': return '🎨';
                case 'sculpture': return '🗿';
                case 'graffiti': return '✨';
                case 'gallery': return '🏛️';
                case 'shop': return '🏪';
                case 'studio': return '🏠';
                case 'wall': return '🧱';
                case 'artwork': default: return '🎯';
              }
            };
            
            const getMarkerColor = (type) => {
              switch(type?.toLowerCase()) {
                case 'mural': return '#e74c3c';      // Red
                case 'sculpture': return '#8e44ad';  // Purple
                case 'graffiti': return '#f39c12';   // Orange
                case 'gallery': return '#2980b9';    // Blue
                case 'shop': return '#27ae60';       // Green
                case 'studio': return '#e67e22';     // Dark orange
                case 'wall': return '#95a5a6';       // Gray
                case 'artwork': default: return '#FFD700'; // Gold
              }
            };
            
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
                    <div 
                      className="marker-dot marker-with-icon" 
                      style={{ 
                        backgroundColor: getMarkerColor(location.type),
                        position: 'relative'
                      }}
                    >
                      <span 
                        className="marker-icon" 
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          fontSize: '12px',
                          lineHeight: 1
                        }}
                      >
                        {getMarkerIcon(location.type)}
                      </span>
                    </div>
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

      
          {/* Removed problematic vector source that was causing 404 errors */}

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
          <SmartNavigation
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
