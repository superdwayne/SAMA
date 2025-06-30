import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './ActivatePage.css';

function ActivatePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('activating'); // activating, success, error
  const [message, setMessage] = useState('');
  const [accessInfo, setAccessInfo] = useState(null);
  
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  
  useEffect(() => {
    if (!token || !email) {
      setStatus('error');
      setMessage('Invalid activation link. Missing token or email.');
      return;
    }
    
    activateAccess();
  }, [token, email]);
  
  const activateAccess = async () => {
    try {
      const response = await fetch(`/api/activate?token=${token}&email=${encodeURIComponent(email)}`);
      const data = await response.json();
      
      if (data.success) {
        setStatus('success');
        setMessage('Your access has been activated successfully!');
        setAccessInfo({
          region: data.region,
          accessToken: data.accessToken,
          expiresAt: data.expiresAt
        });
        
        // Store access in localStorage for the app
        localStorage.setItem('streetArtAccess', JSON.stringify({
          email: email,
          region: data.region,
          accessToken: data.accessToken,
          expiresAt: data.expiresAt,
          activatedAt: Date.now()
        }));
        
        // Redirect to map after 3 seconds
        setTimeout(() => {
          navigate('/?activated=true');
        }, 3000);
        
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to activate access');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };
  
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  if (status === 'activating') {
    return (
      <div className="activate-container">
        <div className="activate-card">
          <div className="loading-spinner"></div>
          <h2>🔑 Activating Your Access...</h2>
          <p>Please wait while we activate your Amsterdam Street Art Map access.</p>
        </div>
      </div>
    );
  }
  
  if (status === 'success') {
    return (
      <div className="activate-container">
        <div className="activate-card success">
          <div className="success-icon">🎉</div>
          <h2>Access Activated Successfully!</h2>
          <p className="success-message">{message}</p>
          
          {accessInfo && (
            <div className="access-details">
              <div className="access-badge">
                <strong>{accessInfo.region} District</strong>
              </div>
              <p className="expires">Valid until: {formatDate(accessInfo.expiresAt)}</p>
            </div>
          )}
          
          <div className="redirect-info">
            <p>🗺️ Redirecting to your map in 3 seconds...</p>
            <button 
              onClick={() => navigate('/?activated=true')}
              className="explore-button"
            >
              🎨 Start Exploring Now
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (status === 'error') {
    return (
      <div className="activate-container">
        <div className="activate-card error">
          <div className="error-icon">❌</div>
          <h2>Activation Failed</h2>
          <p className="error-message">{message}</p>
          
          <div className="error-help">
            <h3>What can you do?</h3>
            <ul>
              <li>Check if the link has expired (valid for 10 minutes)</li>
              <li>Make sure you're using the same email address</li>
              <li>Contact support if you continue having issues</li>
            </ul>
            
            <button 
              onClick={() => navigate('/')}
              className="home-button"
            >
              🏠 Go to Homepage
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ActivatePage;
