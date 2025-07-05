// Google Analytics 4 utility functions for Amsterdam Street Art Map
// Handles deep links, conversions, and user behavior tracking

import { getGAMeasurementId } from '../hooks/useGoogleAnalytics';

// Get GA Measurement ID from environment or fallback to production ID
const GA_MEASUREMENT_ID = getGAMeasurementId();

// Check if GA is loaded
const isGALoaded = () => {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
};

// Enhanced page view tracking with deep link support
export const trackPageView = (pagePath, pageTitle, additionalParams = {}) => {
  if (!isGALoaded()) return;
  
  const params = {
    page_title: pageTitle,
    page_location: window.location.href,
    page_path: pagePath,
    ...additionalParams
  };
  
  // Track deep link parameters
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('magic')) {
    params.magic_link_used = true;
  }
  if (urlParams.get('token')) {
    params.token_entry = true;
  }
  if (urlParams.get('utm_source')) {
    params.utm_source = urlParams.get('utm_source');
  }
  if (urlParams.get('utm_medium')) {
    params.utm_medium = urlParams.get('utm_medium');
  }
  if (urlParams.get('utm_campaign')) {
    params.utm_campaign = urlParams.get('utm_campaign');
  }
  
  window.gtag('config', GA_MEASUREMENT_ID, params);
  console.log('📊 GA: Page view tracked:', params);
};

// Track district/region interactions
export const trackRegionInteraction = (region, action, value = null) => {
  if (!isGALoaded()) return;
  
  window.gtag('event', action, {
    event_category: 'Region',
    event_label: region,
    value: value,
    custom_parameter_region: region
  });
  
  console.log(`📊 GA: Region ${action}:`, region);
};

// Track payment events (critical for ROI analysis)
export const trackPaymentEvent = (region, amount, currency = 'EUR', stage = 'initiated') => {
  if (!isGALoaded()) return;
  
  const eventData = {
    event_category: 'Payment',
    event_label: region,
    value: amount,
    currency: currency,
    payment_stage: stage, // initiated, redirected, completed, failed
    region: region
  };
  
  // Use enhanced ecommerce events
  if (stage === 'completed') {
    window.gtag('event', 'purchase', {
      transaction_id: `${region}_${Date.now()}`,
      value: amount,
      currency: currency,
      items: [{
        item_id: `region_${region.toLowerCase()}`,
        item_name: `${region} District Access`,
        item_category: 'Digital Content',
        quantity: 1,
        price: amount
      }]
    });
  } else {
    window.gtag('event', `payment_${stage}`, eventData);
  }
  
  console.log(`📊 GA: Payment ${stage}:`, eventData);
};

// Track magic link usage
export const trackMagicLinkEvent = (email, regions, success = true) => {
  if (!isGALoaded()) return;
  
  window.gtag('event', success ? 'magic_link_success' : 'magic_link_failed', {
    event_category: 'Authentication',
    event_label: email ? 'with_email' : 'anonymous',
    value: regions ? regions.length : 0,
    regions_unlocked: regions ? regions.join(',') : '',
    user_type: regions && regions.length > 1 ? 'multi_region' : 'single_region'
  });
  
  console.log('📊 GA: Magic link event:', { email: !!email, regions, success });
};

// Track artwork/pin interactions
export const trackArtworkInteraction = (artworkId, region, action = 'view') => {
  if (!isGALoaded()) return;
  
  window.gtag('event', 'artwork_interaction', {
    event_category: 'Content',
    event_label: action,
    artwork_id: artworkId,
    region: region,
    interaction_type: action // view, click, expand, share
  });
  
  console.log('📊 GA: Artwork interaction:', { artworkId, region, action });
};

// Track map interactions
export const trackMapInteraction = (action, region = null, coordinates = null) => {
  if (!isGALoaded()) return;
  
  const eventData = {
    event_category: 'Map',
    event_label: action,
    map_action: action // zoom, pan, center, filter
  };
  
  if (region) eventData.region = region;
  if (coordinates) {
    eventData.lat = coordinates.lat;
    eventData.lng = coordinates.lng;
  }
  
  window.gtag('event', 'map_interaction', eventData);
  console.log('📊 GA: Map interaction:', eventData);
};

// Track user journey milestones
export const trackUserJourney = (milestone, additionalData = {}) => {
  if (!isGALoaded()) return;
  
  const journeyEvents = {
    'landing_page_view': 'User viewed landing page',
    'map_first_load': 'User first loaded the map',
    'region_locked_encounter': 'User encountered locked region',
    'payment_page_view': 'User viewed payment page',
    'payment_completed': 'User completed payment',
    'magic_link_clicked': 'User clicked magic link',
    'content_unlocked': 'User successfully unlocked content',
    'artwork_first_view': 'User viewed first artwork',
    'return_visit': 'User returned to the app'
  };
  
  window.gtag('event', milestone, {
    event_category: 'User Journey',
    event_label: journeyEvents[milestone] || milestone,
    ...additionalData
  });
  
  console.log('📊 GA: User journey:', milestone, additionalData);
};

// Track errors and technical issues
export const trackError = (errorType, errorMessage, context = {}) => {
  if (!isGALoaded()) return;
  
  window.gtag('event', 'exception', {
    description: `${errorType}: ${errorMessage}`,
    fatal: false,
    error_context: JSON.stringify(context)
  });
  
  console.log('📊 GA: Error tracked:', { errorType, errorMessage, context });
};

// Track deep link performance
export const trackDeepLinkUsage = (linkType, source, success = true) => {
  if (!isGALoaded()) return;
  
  window.gtag('event', 'deep_link_usage', {
    event_category: 'Deep Links',
    event_label: linkType, // magic_link, direct_region, token_entry
    link_source: source, // email, social, direct, sms
    success: success,
    timestamp: Date.now()
  });
  
  console.log('📊 GA: Deep link usage:', { linkType, source, success });
};

// Track business metrics
export const trackBusinessMetric = (metric, value, region = null) => {
  if (!isGALoaded()) return;
  
  window.gtag('event', 'business_metric', {
    event_category: 'Business',
    event_label: metric, // conversion_rate, customer_lifetime_value, churn_rate
    value: value,
    region: region,
    timestamp: Date.now()
  });
  
  console.log('📊 GA: Business metric:', { metric, value, region });
};

// Helper function to get current session data
export const getCurrentSessionData = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    hasMagicLink: !!urlParams.get('magic'),
    hasToken: !!urlParams.get('token'),
    utm_source: urlParams.get('utm_source'),
    utm_medium: urlParams.get('utm_medium'),
    utm_campaign: urlParams.get('utm_campaign'),
    referrer: document.referrer,
    timestamp: Date.now()
  };
};
