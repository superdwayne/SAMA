import { useEffect } from 'react';

// Google Analytics initialization hook
export const useGoogleAnalytics = () => {
  useEffect(() => {
    const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
    
    // Only initialize if we have a valid GA ID
    if (!GA_MEASUREMENT_ID || GA_MEASUREMENT_ID === 'G-8J50MVTWQN') {
      console.warn('⚠️ Google Analytics not initialized - missing VITE_GA_MEASUREMENT_ID');
      return;
    }

    // Check if already loaded
    if (window.gtag) {
      console.log('📊 Google Analytics already loaded');
      return;
    }

    console.log('📊 Initializing Google Analytics with ID:', GA_MEASUREMENT_ID);

    // Load GA script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    // Initialize GA
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };
    
    script.onload = () => {
      window.gtag('js', new Date());
      window.gtag('config', GA_MEASUREMENT_ID, {
        page_title: 'Amsterdam Street Art Map',
        page_location: window.location.href,
        send_page_view: true,
        // Enhanced measurement
        enhanced_measurement_settings: {
          scrolls: true,
          outbound_clicks: true,
          site_search: true,
          video_engagement: true,
          file_downloads: true
        },
        // Custom parameters for your app
        custom_map: {
          app_name: 'Amsterdam Street Art Map',
          app_version: '1.0.0',
          environment: import.meta.env.MODE
        }
      });
      
      console.log('✅ Google Analytics initialized successfully');
    };

    script.onerror = () => {
      console.error('❌ Failed to load Google Analytics script');
    };

  }, []);
};

// Export the GA ID for use in analytics utilities
export const getGAMeasurementId = () => {
  return import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-8J50MVTWQN';
};