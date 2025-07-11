import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { trackPageView, trackUserJourney, trackMagicLinkEvent } from './utils/analytics';
import { useGoogleAnalytics } from './hooks/useGoogleAnalytics';
import Map from './components/Map';
import { fetchMapboxDataset } from './utils/mapboxData';
import { toOptimizedThumb, registerRegionThumb } from './utils/image';
import Payment from './components/Payment';
import TokenEntry from './components/TokenEntry';
import EmailTest from './components/EmailTest';
import TokenTest from './components/TokenTest';
import DatasetDebug from './components/DatasetDebug';
import QuickTest from './components/QuickTest';
import Success from './components/Success';
import ActivatePage from './pages/ActivatePage';
import RegionDetailPage from './pages/RegionDetailPage';
import Landing from './components/Landing';
import NoAccessPrompt from './components/NoAccessPrompt';

import { checkAccessToken, getUnlockedRegions, handleMagicLinkAuth } from './utils/auth';
import './App.css';

function App() {
  const [unlockedRegions, setUnlockedRegions] = useState([]); // 🔒 NO FREE REGIONS
  const [isLoading, setIsLoading] = useState(true);
  const [authMessage, setAuthMessage] = useState(null);
  const [showNoAccess, setShowNoAccess] = useState(false);

  // Initialize Google Analytics
  useGoogleAnalytics();

  useEffect(() => {
    // Track app initialization
    trackUserJourney('app_initialized');

    // Prefetch Mapbox datasets for main regions to speed up image loading
    const prefetchDatasets = async () => {
      const regionsToPrefetch = ['Centre', 'Noord', 'East', 'Nieuw-West'];
      try {
        const datasets = await Promise.all(regionsToPrefetch.map(r => fetchMapboxDataset(r)));
        // Preload one optimized image per region for faster swap
        regionsToPrefetch.forEach((regionName, idx) => {
          const locations = datasets[idx] || [];
          const candidate = locations.find(loc => (loc.image_url || loc.image));
          if (candidate) {
            const raw = candidate.image_url || candidate.image;
            const optimized = toOptimizedThumb(raw);
            registerRegionThumb(regionName, optimized);
            const img = new Image();
            img.src = optimized;
          }
        });
        console.log('📥 Prefetched datasets & preloaded region thumbnails');
      } catch (err) {
        console.warn('⚠️ Prefetching Mapbox datasets failed:', err);
      }
    };
    prefetchDatasets();
    
    // Check which regions user has access to
    const checkAccess = async () => {
      try {
        // First, check if there's a magic link in the URL
        const magicLinkResult = await handleMagicLinkAuth();
        
        if (magicLinkResult.success) {
          // Magic link authentication successful
          const regions = magicLinkResult.regions;
          setUnlockedRegions(regions); // Only purchased regions
          
          // Track magic link success
          trackMagicLinkEvent(magicLinkResult.email, regions, true);
          trackUserJourney('magic_link_success', { regions: regions.length });
          
          if (regions.length > 0) {
            setAuthMessage({
              type: 'success',
              message: `Welcome! You now have access to ${regions.length} region${regions.length > 1 ? 's' : ''}: ${regions.join(', ')}`
            });
            setShowNoAccess(false);
          } else {
            setAuthMessage({
              type: 'success',
              message: 'Authentication successful! Please purchase a region to start exploring.'
            });
            setShowNoAccess(true);
          }
        } else if (magicLinkResult.error && magicLinkResult.error !== 'No magic link found') {
          // Magic link authentication failed
          setAuthMessage({
            type: 'error',
            message: `Authentication failed: ${magicLinkResult.error}`
          });
          setShowNoAccess(true);
        }
        
        // Check existing access token
        const hasAccess = await checkAccessToken();
        if (hasAccess) {
          const regions = getUnlockedRegions();
          setUnlockedRegions(regions); // Only purchased regions
          
          console.log('🔑 User has access to regions:', regions);
          setShowNoAccess(regions.length === 0);
        } else {
          console.log('🔒 No existing access found - all regions locked');
          setUnlockedRegions([]); // Ensure no regions are unlocked
          setShowNoAccess(true);
        }
      } catch (error) {
        console.error('Error during authentication check:', error);
        setAuthMessage({
          type: 'error',
          message: 'Authentication error. Please try again.'
        });
        setUnlockedRegions([]); // Ensure no regions are unlocked on error
        setShowNoAccess(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAccess();
  }, []);

  // Clear auth message after 5 seconds
  useEffect(() => {
    if (authMessage) {
      const timer = setTimeout(() => setAuthMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [authMessage]);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading Amsterdam Street Art Map...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        {/* Authentication status message */}
        {authMessage && (
          <div className={`auth-message ${authMessage.type}`}>
            <div className="auth-message-content">
              {authMessage.type === 'success' ? '🎉' : '❌'} {authMessage.message}
              <button 
                className="auth-message-close"
                onClick={() => setAuthMessage(null)}
              >
                ×
              </button>
            </div>
          </div>
        )}

       

        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/region/:id" element={<RegionDetailPage />} />
          <Route path="/map" element={<Map unlockedRegions={unlockedRegions} setUnlockedRegions={setUnlockedRegions} />} />
          <Route path="/payment/:region" element={<Payment setUnlockedRegions={setUnlockedRegions} />} />
          <Route path="/token" element={<TokenEntry setUnlockedRegions={setUnlockedRegions} />} />
          <Route path="/activate" element={<ActivatePage />} />
          <Route path="/email-test" element={<EmailTest />} />
          <Route path="/token-test" element={<TokenTest setUnlockedRegions={setUnlockedRegions} />} />
          <Route path="/debug-dataset" element={<DatasetDebug />} />
          <Route path="/quick-test" element={<QuickTest />} />
          <Route path="/success" element={<Success />} />
          <Route path="/thank-you" element={<Success />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
