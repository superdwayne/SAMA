import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { artRoutes, routeDifficulty, getRouteLocations } from '../data/routes';
import { streetArtLocations } from '../data/locations';
import './RouteNavigator.css';

const RouteNavigator = ({ unlockedRegions, onSelectRoute, onClose, currentLocation }) => {
  const navigate = useNavigate();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [filteredRoutes, setFilteredRoutes] = useState(artRoutes);

  useEffect(() => {
    filterRoutes();
  }, [selectedFilter, unlockedRegions]);

  const filterRoutes = () => {
    let routes = artRoutes;

    switch (selectedFilter) {
      case 'unlocked':
        routes = routes.filter(route => 
          route.districts.every(district => unlockedRegions.includes(district))
        );
        break;
      case 'easy':
        routes = routes.filter(route => route.difficulty === 'Easy');
        break;
      case 'moderate':
        routes = routes.filter(route => route.difficulty === 'Moderate');
        break;
      case 'challenging':
        routes = routes.filter(route => route.difficulty === 'Challenging');
        break;
      case 'nearby':
        if (currentLocation) {
          routes = routes.sort((a, b) => {
            const distanceA = calculateDistance(currentLocation, a.startPoint);
            const distanceB = calculateDistance(currentLocation, b.startPoint);
            return distanceA - distanceB;
          });
        }
        break;
      default:
        break;
    }

    setFilteredRoutes(routes);
  };

  const calculateDistance = (point1, point2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.lat - point1.latitude) * Math.PI / 180;
    const dLng = (point2.lng - point1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const isRouteUnlocked = (route) => {
    return route.districts.every(district => unlockedRegions.includes(district));
  };

  const getLockedDistricts = (route) => {
    return route.districts.filter(district => !unlockedRegions.includes(district));
  };

  const handleStartRoute = (route) => {
    if (isRouteUnlocked(route)) {
      onSelectRoute(route);
      onClose();
    } else {
      // Show unlock prompt for first locked district
      const lockedDistricts = getLockedDistricts(route);
      navigate(`/payment/${lockedDistricts[0]}`);
    }
  };

  const RouteCard = ({ route }) => {
    const unlocked = isRouteUnlocked(route);
    const lockedDistricts = getLockedDistricts(route);
    const routeLocations = getRouteLocations(route.id, streetArtLocations);
    const difficultyInfo = routeDifficulty[route.difficulty];

    return (
      <div className={`route-card ${!unlocked ? 'locked' : ''}`}>
        {/* Card Image Placeholder */}
        <div className="route-image-placeholder">
          <div className="image-overlay">
            <div className="route-icon">{route.icon}</div>
          </div>
          {!unlocked && (
            <div className="lock-badge">
              🔒
            </div>
          )}
        </div>

        {/* Card Content */}
        <div className="route-card-content">
          <h3 className="route-card-title">{route.name}</h3>
          <p className="route-card-description">{route.description}</p>
          
          {/* Action Button */}
          <button 
            className={`route-card-button ${!unlocked ? 'unlock-button' : 'start-button'}`}
            onClick={() => handleStartRoute(route)}
          >
            {unlocked ? 'Start Route' : 'Get it now'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="route-navigator-overlay">
      <div className="route-navigator">
        {/* Header */}
        <div className="navigator-header">
          <div className="header-content">
            <h1 className="navigator-title">Discover Art Routes</h1>
            <p className="navigator-subtitle">Curated walking tours through Amsterdam's street art scene</p>
          </div>
          <button className="close-navigator" onClick={onClose}>
            <span>✕</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="filter-section">
          <div className="filter-pills">
            <button 
              className={`filter-pill ${selectedFilter === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedFilter('all')}
            >
              <span>All</span>
              <span className="pill-count">{artRoutes.length}</span>
            </button>
            <button 
              className={`filter-pill ${selectedFilter === 'unlocked' ? 'active' : ''}`}
              onClick={() => setSelectedFilter('unlocked')}
            >
              <span>Available</span>
              <span className="pill-count">{artRoutes.filter(r => isRouteUnlocked(r)).length}</span>
            </button>
            <button 
              className={`filter-pill ${selectedFilter === 'easy' ? 'active' : ''}`}
              onClick={() => setSelectedFilter('easy')}
            >
              <span>🌱 Easy</span>
            </button>
            <button 
              className={`filter-pill ${selectedFilter === 'moderate' ? 'active' : ''}`}
              onClick={() => setSelectedFilter('moderate')}
            >
              <span>🚶 Moderate</span>
            </button>
            <button 
              className={`filter-pill ${selectedFilter === 'challenging' ? 'active' : ''}`}
              onClick={() => setSelectedFilter('challenging')}
            >
              <span>🏃 Challenging</span>
            </button>
            {currentLocation && (
              <button 
                className={`filter-pill ${selectedFilter === 'nearby' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('nearby')}
              >
                <span>📍 Nearby</span>
              </button>
            )}
          </div>
        </div>

        {/* Routes Feed */}
        <div className="routes-feed">
          {filteredRoutes.map(route => (
            <RouteCard key={route.id} route={route} />
          ))}
        </div>

        {/* Empty State */}
        {filteredRoutes.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🗺️</div>
            <h3>No routes found</h3>
            <p>Try adjusting your filters to see more routes</p>
            <button 
              className="reset-filters-btn"
              onClick={() => setSelectedFilter('all')}
            >
              Show All Routes
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteNavigator;