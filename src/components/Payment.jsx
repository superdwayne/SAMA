import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { trackPaymentEvent, trackRegionInteraction, trackUserJourney } from '../utils/analytics';
import { fetchPrice as fetchPriceFromAPI } from '../utils/api';
import { fetchDefaultRegionPrice, getFallbackPrice } from '../utils/pricing';
import './Payment.css';

const Payment = ({ setUnlockedRegions }) => {
  const navigate = useNavigate();
  const { region } = useParams();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [price, setPrice] = useState(null);
  const [priceSubtitle, setPriceSubtitle] = useState('One-time payment');
  const [priceDescription, setPriceDescription] = useState('Lifetime access to all content in this district');
  const [loadingPrice, setLoadingPrice] = useState(true);
  
  // Enable scrolling for payment page
  useEffect(() => {
    console.log('Payment page mounted, region:', region);
    
    // Add classes for CSS styling
    document.body.classList.add('payment-page');
    const root = document.getElementById('root');
    if (root) {
      root.classList.add('payment-container');
    }
    
    // Minimal style override for mobile scrolling
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
      document.body.classList.remove('payment-page');
      if (root) {
        root.classList.remove('payment-container');
      }
    };
  }, [region]);
  
  // Get region info
  const regionInfo = {
    'centre': { artworks: 25, galleries: 3, walls: 2, artists: 15, description: 'Tourists, tags & tension.\nThe city\'s loudest gallery' },
    'center': { artworks: 25, galleries: 3, walls: 2, artists: 15, description: 'Tourists, tags & tension.\nThe city\'s loudest gallery' },
    'noord': { artworks: 40, galleries: 5, walls: 4, artists: 25, description: 'From shipyards to street art.\nNorth is culture unleashed' },
    'north': { artworks: 40, galleries: 5, walls: 4, artists: 25, description: 'From shipyards to street art.\nNorth is culture unleashed' },
    'south': { artworks: 28, galleries: 4, walls: 2, artists: 20, description: 'Upscale galleries meet urban edge.\nWhere sophistication gets street smart' },
    'zuid': { artworks: 28, galleries: 4, walls: 2, artists: 20, description: 'Upscale galleries meet urban edge.\nWhere sophistication gets street smart' },
    'east': { artworks: 30, galleries: 2, walls: 3, artists: 18, description: 'East is hip, hungry and\ncovered in color' },
    'nieuw-west': { artworks: 15, galleries: 1, walls: 3, artists: 8, description: 'Emerging street art destination\nwith fresh perspectives' },
    'south-east': { artworks: 22, galleries: 3, walls: 2, artists: 16, description: 'Where tradition meets innovation.\nA vibrant cultural crossroads' },
    'west': { artworks: 18, galleries: 2, walls: 2, artists: 12, description: 'Historic charm meets modern creativity.\nWest Amsterdam\'s artistic soul' }
  };
  
  const info = regionInfo[region?.toLowerCase()] || regionInfo['centre'];
  
  // Properly format region names to match Stripe links
  const formatRegionName = (regionStr) => {
    if (!regionStr) return 'Centre';
    const lower = regionStr.toLowerCase();
    if (lower === 'nieuw-west' || lower === 'new-west') return 'Nieuw-West';
    if (lower === 'centre' || lower === 'center') return 'Centre';
    if (lower === 'noord' || lower === 'north') return 'North';
    if (lower === 'south' || lower === 'zuid') return 'South';
    if (lower === 'east' || lower === 'oost') return 'East';
    if (lower === 'south-east' || lower === 'southeast') return 'South-East';
    if (lower === 'west') return 'West';
    return regionStr.charAt(0).toUpperCase() + regionStr.slice(1);
  };
  
  const displayRegion = formatRegionName(region);
  
  // Fetch price from Stripe
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        setLoadingPrice(true);
        
        // Use the new dynamic pricing system
        const priceData = await fetchDefaultRegionPrice(displayRegion.toLowerCase());
        setPrice(priceData.formattedPrice);
        setPriceSubtitle(priceData.recurring ? `Every ${priceData.interval}` : 'One-time payment');
        setPriceDescription(priceData.recurring 
          ? 'Access to all content in this district' 
          : 'Lifetime access to all content in this district'
        );
        
      } catch (error) {
        console.error('❌ Payment component - Failed to fetch price:', error);
        // Use the new fallback system
        const fallbackPrice = getFallbackPrice(displayRegion.toLowerCase());
        setPrice(fallbackPrice);
        setPriceSubtitle('One-time payment');
        setPriceDescription('Lifetime access to all content in this district');
      } finally {
        setLoadingPrice(false);
      }
    };

    fetchPrice();
  }, [displayRegion]);
  
  // Track payment page view
  useEffect(() => {
    trackRegionInteraction(displayRegion, 'payment_page_viewed');
    trackUserJourney('payment_page_view', { region: displayRegion });
  }, [displayRegion]);

  // Helper function to render region description with custom styling
  const renderRegionDescription = (description, regionKey) => {
    if (regionKey === 'centre' || regionKey === 'center') {
      return (
        <div>
          <span className="region-description-ultrabold">Tourists, tags & tension.</span>
          <br />
          <span className="region-description-regular">The city's loudest gallery</span>
        </div>
      );
    }
    
    // For other regions, render with line breaks
    return description.split('\n').map((line, index) => (
      <span key={index}>
        {line}
        {index < description.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  const handlePayment = async () => {
    setProcessing(true);
    setError(null);

      // Direct Stripe links for each region (with embedded metadata)
  const stripeLinks = {
    'Centre': 'https://buy.stripe.com/aFa6oIf2j9OU1ir4cL1oI0M',
    'Center': 'https://buy.stripe.com/aFa6oIf2j9OU1ir4cL1oI0M', // Alternative spelling
    'Noord': 'https://buy.stripe.com/14AbJ23jB4uA7GP5gP1oI0L',
    'North': 'https://buy.stripe.com/14AbJ23jB4uA7GP5gP1oI0L', // Alternative spelling
    'East': 'https://buy.stripe.com/dRmfZidYf1ioe5d8t11oI0Q',
    'Nieuw-West': 'https://buy.stripe.com/bJe28s8DVbX27GP7oX1oI0N',
    'New-West': 'https://buy.stripe.com/bJe28s8DVbX27GP7oX1oI0N', // Alternative spelling
    'South': 'https://buy.stripe.com/aFa28s3jBe5ad1910z1oI0P',
    'Zuid': 'https://buy.stripe.com/aFa28s3jBe5ad1910z1oI0P', // Alternative Dutch spelling
    'South-East': 'https://buy.stripe.com/14A8wQdYfe5a6CLfVt1oI0K',
    'West': 'https://buy.stripe.com/14A9AU7zR7GM6CL38H1oI0O'
  };

    const stripeUrl = stripeLinks[displayRegion];
    
    if (stripeUrl) {
      console.log('🔗 Redirecting to Stripe for', displayRegion, '→', stripeUrl);
      
      // Track payment initiation
      trackPaymentEvent(displayRegion, 4.99, 'EUR', 'redirected');
      trackUserJourney('payment_redirect_to_stripe', { region: displayRegion });
      
      window.location.href = stripeUrl;
    } else {
      console.error('❌ No Stripe link found for region:', displayRegion);
      setError(`No payment link configured for ${displayRegion}`);
      setProcessing(false);
    }
  };

  return (
    <div className="payment-container-new">
      {/* Back Button */}
      <button className="popup-back-btn payment-back-btn" onClick={() => navigate(`/region/${region}`)} aria-label="Back">
        <span className="back-arrow">
          <img src="/images/back.png" alt="Back" className="back-arrow-img" />
        </span>
      </button>
      
      {/* Main Content */}
      <div className="payment-content-new">
        {/* Header */}
        <h1 className="unlock-title">UNLOCK<br/>{displayRegion.toUpperCase()} DISTRICT</h1>
        
        {/* Featured Highlight Section */}
        <div className="featured-highlight">
          <h2 className="highlight-title">Featured Highlight</h2>
          <p className="highlight-description">{renderRegionDescription(info.description, region?.toLowerCase())}</p>
        </div>
        
        {/* What is included Section */}
        <div className="included-section">
          <h3 className="included-title">What is included:</h3>
          <div className="included-row">
            <span className="stat-icon">📍</span>
            <span className="stat-number">{info.artworks}</span>
            <span className="stat-label">Artworks</span>

            <span className="stat-icon">🏛️</span>
            <span className="stat-number">{info.galleries}</span>
            <span className="stat-label">Galleries</span>

            <span className="stat-icon">🎨</span>
            <span className="stat-number">{info.walls}</span>
            <span className="stat-label">Legal Walls</span>

            <span className="stat-icon">👥</span>
            <span className="stat-number">{info.artists}</span>
            <span className="stat-label">Artists</span>
          </div>
        </div>
        
        {/* Price and Payment Button */}
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
          </div>
          
          <button 
            className="unlock-button" 
            onClick={handlePayment}
            disabled={processing}
          >
            {processing ? 'Redirecting to payment...' : `Unlock ${displayRegion.toUpperCase()} District`}
          </button>
          
          {error && (
            <div className="payment-error">
              ❌ {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Payment;
