import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { amsterdamRegions } from '../data/regions';
import { fetchMapboxDataset } from '../utils/mapboxData';
import { toOptimizedThumb, registerRegionThumb, getRegionThumb } from '../utils/image';
import EmailMagicLink from '../components/EmailMagicLink';
import BrickWallIcon from '../components/BrickWallIcon';
import './RegionDetailPage.css';



// Convert GeoJSON regions to the format expected by RegionDetailPage
const regions = amsterdamRegions.features.map(feature => {
  const props = feature.properties;
  return {
    id: props.name.toLowerCase().replace(/\s+/g, '-'),
    title: props.name,
    description: props.description,
    latitude: feature.geometry.coordinates[0][0][1], // Use first coordinate
    longitude: feature.geometry.coordinates[0][0][0],
    isFree: false,
    image: '/images/center.png'
  };
});

const regionStats = {
  'Centre': {
    artworks: 25,
    galleries: 3,
    legalWalls: 2,
    featuredArtists: 15,
    image: '/images/collage.png'
  },
  'Noord': {
    artworks: 40,
    galleries: 5,
    legalWalls: 4,
    featuredArtists: 25,
    image: '/images/collage.png'
  },
  'East': {
    artworks: 30,
    galleries: 2,
    legalWalls: 3,
    featuredArtists: 18,
    image: '/images/collage.png'
  },
  'West': {
    artworks: 22,
    galleries: 3,
    legalWalls: 2,
    featuredArtists: 14,
    image: '/images/collage.png'
  },
  'South-East': {
    artworks: 18,
    galleries: 1,
    legalWalls: 2,
    featuredArtists: 10,
    image: '/images/collage.png'
  },
  'Nieuw-West': {
    artworks: 15,
    galleries: 1,
    legalWalls: 3,
    featuredArtists: 8,
    image: '/images/collage.png'
  },
  'South': {
    artworks: 20,
    galleries: 2,
    legalWalls: 1,
    featuredArtists: 12,
    image: '/images/collage.png'
  },
};

// Alias map: maps all possible slugs/aliases to canonical region IDs
const regionAliasMap = {
  'centre': 'centre',
  'center': 'centre',
  'centrum': 'centre',
  'noord': 'noord',
  'north': 'noord',
  'east': 'east',
  'oost': 'east',
  'nieuw-west': 'nieuw-west',
  'new-west': 'nieuw-west',
  'west': 'west', // Fixed: West should be its own region
  'south': 'south',
  'zuid': 'south',
  'south-east': 'south-east', // Fixed: South-East should be its own region
  'zuidoost': 'south-east',
};

const RegionDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [price, setPrice] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(true);
  
  // Normalize the id from the URL and map aliases to canonical region id
  const normalizedId = id ? id.toLowerCase() : '';
  const canonicalId = regionAliasMap[normalizedId] || normalizedId;

  // Find the region by canonical ID
  const region = regions.find(r => r.id === canonicalId);
  
  // Helper function to render region description with custom styling
  const renderRegionDescription = (region) => {
    if (region.id === 'centre') {
      return (
        <div>
          <span className="region-description-ultrabold">Tourists, tags & tension.</span>
          <br />
          <span className="region-description-regular">The city's loudest gallery</span>
        </div>
      );
    }
    
    // For other regions, render with HTML
    return <span dangerouslySetInnerHTML={{ __html: region.description }} />;
  };
  
  // Enable scrolling for this page - Minimal Safe Version
  useEffect(() => {
    console.log('RegionDetailPage mounted, region ID:', id);
    console.log('Region found:', region?.title || 'NOT FOUND');
    
    // Add classes for CSS styling
    document.body.classList.add('region-detail-page');
    const root = document.getElementById('root');
    if (root) {
      root.classList.add('region-detail-container');
    }
    
    // Minimal style override - let CSS handle most of it
    const body = document.body;
    if (body && window.innerWidth <= 768) {
      body.style.position = 'static';
      body.style.overflow = 'auto';
      if (root) {
        root.style.position = 'static';
        root.style.overflow = 'auto';
      }
    }
    
    // Cleanup
    return () => {
      document.body.classList.remove('region-detail-page');
      if (root) {
        root.classList.remove('region-detail-container');
      }
      // Let CSS reset handle the rest
    };
  }, [id, region]);
  
  // Better error handling - don't redirect immediately
  if (!region) {
    console.error('Region not found:', id);
    console.log('Available regions:', regions.map(r => r.id));
    
    // Show error state instead of immediate redirect
    return (
      <div className="region-detail-page">
        <div className="region-content-overlay" style={{ marginTop: '20vh', minHeight: '60vh' }}>
          <h1>Region not found</h1>
          <p>The region "{id}" was not found.</p>
          <button onClick={() => navigate('/')} className="get-it-now-btn">
            Go back to home
          </button>
        </div>
      </div>
    );
  }
  
  const regionName = region.title;
  const stats = regionStats[regionName] || regionStats['Centre'];

  // State for dynamic background image, defaulting to the placeholder in stats
  const initialThumb = getRegionThumb(regionName) || stats.image;
  const [backgroundImage, setBackgroundImage] = useState(initialThumb);
  const [showMagicLinkModal, setShowMagicLinkModal] = useState(false);

  // Fetch a random image for this region from the Mapbox dataset
  useEffect(() => {
    let mounted = true;

    const loadRandomImage = async () => {
      try {
        const locations = await fetchMapboxDataset(regionName);

        const urlPool = locations
          .map(loc => loc.image_url || loc.image)
          .filter(url => typeof url === 'string' && url.trim().length > 0)
          .map(raw => {
            const url = raw.trim();
            return /^https?:\/\//i.test(url) ? url : `https://${url.replace(/^\/+/, '')}`;
          });

        console.log(`[RegionDetailPage] Candidate background images for ${regionName}:`, urlPool.length);

        if (mounted && urlPool.length > 0) {
          const randomUrl = urlPool[Math.floor(Math.random() * urlPool.length)];
          const thumb = toOptimizedThumb(randomUrl);
          registerRegionThumb(regionName, thumb);
          setBackgroundImage(thumb);
        }
      } catch (error) {
        console.error('Failed to fetch random region image:', error);
      }
    };

    loadRandomImage();

    return () => {
      mounted = false;
    };
  }, [regionName]);
  
  // Fetch price from Stripe
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        setLoadingPrice(true);
        
        // Price IDs for each region
        const priceIds = {
          'centre': 'price_1RlrHzJ3urOr8HD7UDo4U0vY',
          'center': 'price_1RlrHzJ3urOr8HD7UDo4U0vY',
          'noord': 'price_1RlrKYJ3urOr8HD7HzOpJ8bJ',
          'north': 'price_1RlrKYJ3urOr8HD7HzOpJ8bJ',
          'east': 'price_1RbeqUJ3urOr8HD7ElBhh5rB',
          'nieuw-west': 'price_1Rbf2kJ3urOr8HD7QTcbJLSo',
          'new-west': 'price_1Rbf2kJ3urOr8HD7QTcbJLSo',
          'south': 'price_1RbeqwJ3urOr8HD7Rf6mUldT',
          'zuid': 'price_1RbeqwJ3urOr8HD7Rf6mUldT',
          'south-east': 'price_1Rbf8wJ3urOr8HD7gvLlK0aa',
          'west': 'price_1Rbf23J3urOr8HD7gxyHwFW0'
        };
        
        console.log('🔍 RegionDetailPage - Region ID:', region?.id);
        console.log('🔍 RegionDetailPage - Region Title:', region?.title);
        
        const priceId = priceIds[region?.id];
        console.log('💰 RegionDetailPage - Price ID:', priceId);
        
        if (priceId) {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
          const response = await fetch(`${API_URL}/get-price?priceId=${priceId}`);
          
          if (response.ok) {
            const priceData = await response.json();
            console.log('💰 RegionDetailPage - Price data received:', priceData);
            setPrice(priceData);
          } else {
            console.error('❌ RegionDetailPage - Failed to fetch price:', response.statusText);
            // Fallback to default price
            setPrice({ formattedPrice: '€4,99' });
          }
        } else {
          // Fallback to default price
          setPrice({ formattedPrice: '€4,99' });
        }
      } catch (error) {
        console.error('Error fetching price:', error);
        // Fallback to default price
        setPrice({ formattedPrice: '€4,99' });
      } finally {
        setLoadingPrice(false);
      }
    };

    if (region) {
      fetchPrice();
    }
  }, [region]);
  
  const handleGetItNow = async () => {
    // Direct Stripe links for each region
    const stripeLinks = {
      'centre': 'https://buy.stripe.com/cNi14o5rJ8KQf9hgZx1oI08',
      'center': 'https://buy.stripe.com/cNi14o5rJ8KQf9hgZx1oI08',
      'noord': 'https://buy.stripe.com/00w6oI4nFf9egdl9x51oI07',
      'north': 'https://buy.stripe.com/00w6oI4nFf9egdl9x51oI07',
      'east': 'https://buy.stripe.com/bJe00kdYfe5a3qz24D1oI0c',
      'nieuw-west': 'https://buy.stripe.com/00w00k8DVf9e3qzbFd1oI0a',
      'new-west': 'https://buy.stripe.com/00w00k8DVf9e3qzbFd1oI0a',
      'south': 'https://buy.stripe.com/bJe00kdYfe5a3qz24D1oI0c',
      'zuid': 'https://buy.stripe.com/bJe00kdYfe5a3qz24D1oI0c',
      'south-east': 'https://buy.stripe.com/dRmcN6cUb7GM1ir5gP1oI09',
      'west': 'https://buy.stripe.com/fZu6oI6vNe5af9h7oX1oI0b'
    };

    const stripeUrl = stripeLinks[region.id];
    
    if (stripeUrl) {
      console.log('🔗 Redirecting directly to Stripe for', region.title, '→', stripeUrl);
      window.location.href = stripeUrl;
    } else {
      console.error('❌ No Stripe link found for region:', region.id);
      // Fallback to payment page if no direct link
      navigate(`/payment/${region.id}`);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="region-detail-page">
      {/* Background Street Art Image */}
      <div className="region-background-image">
        {/* Placeholder pattern that looks like street art */}
        <div className="background-placeholder">
          <div className="placeholder-pattern"></div>
        </div>
        {backgroundImage ? (
          <img 
            src={backgroundImage} 
            alt={`${regionName} street art`}
            className="background-img"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : null}
      </div>
      
      {/* Back Button */}
      <button className="region-back-btn" onClick={handleBack} aria-label="Back">
        <span className="back-arrow">
          <img src="/images/back.png" alt="Back" className="back-arrow-img" />
        </span>
      </button>
      
      {/* Magic Link Button */}
      <button 
        className="region-magic-link-btn"
        onClick={() => setShowMagicLinkModal(true)}
        title="Already a customer? Get instant access"
      >
        🔗 Magic Link
      </button>
      
      {/* Main Content Overlay - Yellow Section */}
      <div className="region-content-overlay">
        <div className="tour-label">STREET ART TOUR:</div>
        <h1 className="region-name">{regionName}</h1>
        
        <div className="region-description-box">
          <div className="region-description">{renderRegionDescription(region)}</div>
        </div>
        
        {/* Stats and Map Container - Horizontal Layout */}
        <div className="stats-map-flex">
          <div className="stat-flex-item">
            <div className="stat-row">
              <div className="stat-item">
                <span className="stat-icon">📍</span>
                <span className="stat-number">{stats.artworks}</span>
                <span className="stat-label">Artworks</span>
              </div>
              <div className="stat-item">
                <span className="stat-icon">🏛️</span>
                <span className="stat-number">{stats.galleries}</span>
                <span className="stat-label">Galleries</span>
              </div>
              <div className="stat-item">
                <span className="stat-icon">
                  <BrickWallIcon size={20} />
                </span>
                <span className="stat-number">{stats.legalWalls}</span>
                <span className="stat-label">Legal Walls</span>
              </div>
            </div>
          </div>
          <div className="map-flex-item">
            <img
              src="/images/map.png"
              alt="Map preview"
              className="map-preview-img"
            />
          </div>
        </div>

        <div className="payment-section">
          <div className="price-section">
            <div className="lock-icon">
              <img src="/images/unlockdis.png" alt="Locked" className="unlock-icon-img" />
            </div>
            <div className="price-large">
              {loadingPrice ? 'Loading...' : (price?.formattedPrice || '€4,99')}
            </div>
            <div className="price-subtitle">One-time payment</div>
            <div className="price-description">
              Lifetime access to all<br/>
              content in this district
            </div>
            <button className="get-it-now-btn" onClick={handleGetItNow}>
        Unlock District
        </button>
          </div>
          
        </div>
        
        {/* Action Button */}
       
      </div>
      
      {/* Magic Link Modal */}
      {showMagicLinkModal && (
        <EmailMagicLink 
          onSuccess={() => {
            setShowMagicLinkModal(false);
            // Could show a success message here
          }}
          onClose={() => setShowMagicLinkModal(false)}
        />
      )}
    </div>
  );
};

export default RegionDetailPage;