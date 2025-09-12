import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RegionPreview.css';
// Utils
import { fetchMapboxDataset } from '../utils/mapboxData';
import { toOptimizedThumb, getRegionThumb, registerRegionThumb } from '../utils/image';
import { getRegionStats } from '../data/regions';
import DynamicTypeStats from './DynamicTypeStats';

const RegionPreview = ({ region, onClose }) => {
  const navigate = useNavigate();
  const [regionStats, setRegionStats] = useState({});
  const [statsLoading, setStatsLoading] = useState(true);
  
  if (!region) return null;
  
  const regionName = region.title === 'Center' ? 'Center' : region.title;
  const stats = regionStats[regionName] || { totalLocations: 0, types: {} };

  // State to hold the background image. Defaults to the static placeholder.
  const [backgroundImage, setBackgroundImage] = useState('/images/collage.png');

  // Load dynamic region statistics from Mapbox
  useEffect(() => {
    const loadRegionStats = async () => {
      try {
        setStatsLoading(true);
        
        console.log('📊 Loading dynamic stats for region preview:', regionName);
        const regionSpecificStats = await getRegionStats(regionName);
        setRegionStats({ [regionName]: regionSpecificStats });
        
        console.log('✅ Region preview stats loaded:', regionSpecificStats);
      } catch (error) {
        console.error('❌ Failed to load region preview stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    loadRegionStats();
  }, [regionName]);

  // Fetch a random image from the Mapbox dataset whenever the region changes
  useEffect(() => {
    let isMounted = true;

    const loadRandomImage = async () => {
      try {
        const locations = await fetchMapboxDataset(regionName);

        // Pull out any valid image URLs
        const urlPool = locations
          .map(loc => loc.image_url || loc.image)
          .filter(url => typeof url === 'string' && url.trim().length > 0)
          .map(raw => {
            const url = raw.trim();
            // Ensure the URL has a scheme; many dataset entries start with "streetartamsterdam.com/..."
            if (/^https?:\/\//i.test(url)) {
              return url;
            }
            // Add https:// if missing
            return `https://${url.replace(/^\/+/, '')}`;
          });

        console.log(`[RegionPreview] Candidate background images for ${regionName}:`, urlPool.length);

        if (isMounted && urlPool.length > 0) {
          const randomUrl = urlPool[Math.floor(Math.random() * urlPool.length)];
          const thumb = toOptimizedThumb(randomUrl);
          registerRegionThumb(regionName, thumb);
          setBackgroundImage(thumb);
        }
      } catch (error) {
        console.error('Failed to load random region image:', error);
      }
    };

    loadRandomImage();

    return () => {
      // Clean-up in case the component unmounts before the fetch resolves
      isMounted = false;
    };
  }, [regionName]);
  
  const isUnlocked = region.isFree || false;
  
  const handleGetItNow = async () => {
    if (isUnlocked) {
      // For free regions, go to the region-specific map
      navigate(`/map?region=${region.title}`);
    } else {
      // For paid regions, go to the region detail page
      navigate(`/region/${region.id}`);
    }
    onClose();
  };

  return (
    <div className="region-detail-container">
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
      <button className="region-back-btn" onClick={onClose} aria-label="Back">
        <span className="back-arrow">
          <img src="/images/back.png" alt="Back" className="back-arrow-img" />
        </span>
      </button>
      
      {/* Main Content Overlay - Yellow Section */}
      <div className="region-content-overlay">
        <div className="tour-label">STREET ART TOUR:</div>
        <h1 className="region-name">{regionName}</h1>
        
        <div className="region-description-box">
          <p className="region-description" dangerouslySetInnerHTML={{ __html: region.description }} />
        </div>
        
        {/* Dynamic Type Statistics */}
        <DynamicTypeStats 
          stats={stats}
          loading={statsLoading}
          error={null}
        />

        {/* Action Button */}
        <button className="get-it-now-btn" onClick={handleGetItNow}>
        Unlock District
        </button>
      </div>
    </div>
  );
};

export default RegionPreview;