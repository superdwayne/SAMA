import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Map from './components/Map';
import Payment from './components/Payment';
import TokenEntry from './components/TokenEntry';
import EmailTest from './components/EmailTest';
import TokenTest from './components/TokenTest';
import DatasetDebug from './components/DatasetDebug';
import QuickTest from './components/QuickTest';
import Success from './components/Success';
import ActivatePage from './pages/ActivatePage';
import Landing from './components/Landing';

import { checkAccessToken, getUnlockedRegions } from './utils/auth';
import './App.css';
import './components/RegionPreview.css'; // Force load RegionPreview styles

function App() {
  const [unlockedRegions, setUnlockedRegions] = useState([]); // Start with no regions unlocked
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check which regions user has access to
    const checkAccess = async () => {
      const access = await checkAccessToken();
      if (access) {
        const regions = getUnlockedRegions();
        setUnlockedRegions(regions);
      }
      setIsLoading(false);
    };
    checkAccess();
  }, []);

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
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/region/:id" element={<Landing />} />
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
