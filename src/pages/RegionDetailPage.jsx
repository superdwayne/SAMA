import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { amsterdamRegions, getRegionStats } from '../data/regions';
import { fetchMapboxDataset } from '../utils/mapboxData';
import { toOptimizedThumb, registerRegionThumb, getRegionThumb } from '../utils/image';
import { fetchRegionPrice, fetchDefaultRegionPrice, getFallbackPrice } from '../utils/pricing';
import EmailMagicLink from '../components/EmailMagicLink';
import BrickWallIcon from '../components/BrickWallIcon';
import DynamicTypeStats from '../components/DynamicTypeStats';
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
  const [priceSubtitle, setPriceSubtitle] = useState('One-time payment');
  const [priceDescription, setPriceDescription] = useState('Lifetime access to all content in this district');
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [regionStats, setRegionStats] = useState({});
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);
  
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
    
    if (region.id === 'nieuw-west') {
      return (
        <div>
          <span className="region-description-ultrabold">From grey to great.</span>
          <br />
          <span className="region-description-regular">New-West paints its own future</span>
        </div>
      );
    }
    
    if (region.id === 'zuid' || region.id === 'south') {
      return (
        <div>
          <span className="region-description-ultrabold">Sleek, chic and secretly scribbled.</span>
          <br />
          <span className="region-description-regular">Flavours and colours, artfully mingled</span>
        </div>
      );
    }
    
    if (region.id === 'west') {
      return (
        <div>
          <span className="region-description-ultrabold">Ladi back but loud.</span>
          <br />
          <span className="region-description-regular">Street art grows between bikes, canals and Foodhallen</span>
        </div>
      );
    }
    
    if (region.id === 'east') {
      return (
        <div>
          <span className="region-description-ultrabold">Hip, hungry and covered in culture.</span>
          <br />
          <span className="region-description-regular">From raw walls to selfies</span>
        </div>
      );
    }
    
    if (region.id === 'noord' || region.id === 'north') {
      return (
        <div>
          <span className="region-description-ultrabold">From shipyards to street art.</span>
          <br />
          <span className="region-description-regular">North is culture unleashed</span>
        </div>
      );
    }
    
    if (region.id === 'south-east') {
      return (
        <div>
          <span className="region-description-ultrabold">Beats on speakers, art on blocks.</span>
          <br />
          <span className="region-description-regular">Every wall is a manifest</span>
        </div>
      );
    }
    
    // For other regions, render with HTML
    return <span dangerouslySetInnerHTML={{ __html: region.description }} />;
  };
  
  // Enable scrolling for this page - Minimal Safe Version
  useEffect(() => {
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
  const stats = regionStats[regionName] || { totalLocations: 0, types: {} };

  // State for dynamic background image
  const [backgroundImage, setBackgroundImage] = useState('/images/collage.png');
  const [showMagicLinkModal, setShowMagicLinkModal] = useState(false);

  // Load dynamic region statistics from Mapbox
  useEffect(() => {
    const loadRegionStats = async () => {
      try {
        setStatsLoading(true);
        setStatsError(null);
        
        console.log('📊 Loading dynamic stats for region:', regionName);
        const regionSpecificStats = await getRegionStats(regionName);
        setRegionStats({ [regionName]: regionSpecificStats });
        
        console.log('✅ Region stats loaded:', regionSpecificStats);
      } catch (error) {
        console.error('❌ Failed to load region stats:', error);
        setStatsError(error.message);
      } finally {
        setStatsLoading(false);
      }
    };

    loadRegionStats();
  }, [regionName]);

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
    const loadPrice = async () => {
      if (!region) return;
      
      try {
        setLoadingPrice(true);
        
        // Use the new dynamic pricing system
        const priceData = await fetchDefaultRegionPrice(region.id);
        setPrice(priceData.formattedPrice);
        setPriceSubtitle(priceData.recurring ? `Every ${priceData.interval}` : 'One-time payment');
        setPriceDescription(priceData.recurring 
          ? 'Access to all content in this district' 
          : 'Lifetime access to all content in this district'
        );
      } catch (error) {
        console.error('❌ Failed to load price:', error);
        // Use the new fallback system
        const fallbackPrice = getFallbackPrice(region.id);
        setPrice(fallbackPrice);
        setPriceSubtitle('One-time payment');
        setPriceDescription('Lifetime access to all content in this district');
      } finally {
        setLoadingPrice(false);
      }
    };

    loadPrice();
  }, [region]);
  
  const handleGetItNow = async () => {
    // Direct Stripe links for each region
    const stripeLinks = {
      'centre': 'https://buy.stripe.com/aFa6oIf2j9OU1ir4cL1oI0M',
      'center': 'https://buy.stripe.com/aFa6oIf2j9OU1ir4cL1oI0M',
      'noord': 'https://buy.stripe.com/14AbJ23jB4uA7GP5gP1oI0L',
      'north': 'https://buy.stripe.com/14AbJ23jB4uA7GP5gP1oI0L',
      'east': 'https://buy.stripe.com/dRmfZidYf1ioe5d8t11oI0Q',
      'nieuw-west': 'https://buy.stripe.com/bJe28s8DVbX27GP7oX1oI0N',
      'new-west': 'https://buy.stripe.com/bJe28s8DVbX27GP7oX1oI0N',
      'south': 'https://buy.stripe.com/aFa28s3jBe5ad1910z1oI0P',
      'zuid': 'https://buy.stripe.com/aFa28s3jBe5ad1910z1oI0P',
      'west': 'https://buy.stripe.com/14A9AU7zR7GM6CL38H1oI0O'
    };

    const stripeUrl = stripeLinks[region.id];
    
    if (stripeUrl) {
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
        
                {/* Dynamic Type Statistics */}
        <DynamicTypeStats 
          stats={stats}
          loading={statsLoading}
          error={statsError}
        />

        <div className="payment-section">
          <div className="price-section">
            <div className="lock-icon">
              <img src="/images/unlockdis.png" alt="Locked" className="unlock-icon-img" />
            </div>
            <div className="price-large">
              {loadingPrice ? 'Loading...' : (price || '€4,99')}
            </div>
            <div className="price-subtitle">
              One-time payment
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