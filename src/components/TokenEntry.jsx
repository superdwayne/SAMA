import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { validateAccessToken, saveAccessToken } from '../utils/auth';
import StripePayment from './StripePayment';
import './TokenEntry.css';

const TokenEntry = ({ setUnlockedRegions }) => {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsValidating(true);

    try {
      const result = await validateAccessToken(token.trim());
      
      if (result.valid) {
        // Save token and unlock regions
        saveAccessToken(result.data.token, result.data.regions, result.data.email || email);
        setUnlockedRegions(result.data.regions);
        
        // Navigate to map
        navigate('/');
      } else {
        setError(result.error || 'Invalid or expired token. Please check your email for the correct token.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="token-entry-container">
      <div className="token-entry-wrapper">
        <button 
          className="back-button"
          onClick={() => navigate('/')}
        >
          ← Back to Map
        </button>

        <div className="token-entry-content">
          <div className="token-icon">🔑</div>
          
          <h1>Enter Your Access Token</h1>
          
          <p className="token-description">
            Enter the access token you received via email after your purchase. 
            Your token provides 1 year of access to all Amsterdam street art regions.
          </p>

          <form onSubmit={handleSubmit} className="token-form">
            <div className="form-group">
              <label htmlFor="email">Email Address (Optional)</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="input-field"
              />
              <p className="input-help">The email where you received your token</p>
            </div>

            <div className="form-group">
              <label htmlFor="token">Access Token</label>
              <input
                type="text"
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter your access token"
                required
                className="input-field token-input"
              />
              <p className="input-help">Copy and paste the token from your email</p>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isValidating}
              className="submit-button"
            >
              {isValidating ? 'Validating...' : 'Activate Access'}
            </button>
          </form>

          <div className="token-info">
            <h3>How it works:</h3>
            <ul>
              <li>Purchase full map access with our secure payment</li>
              <li>Receive a unique access token via email instantly</li>
              <li>Enter your token here to unlock all districts</li>
              <li>Your access is valid for 1 full year</li>
              <li>Access all curated routes and premium features</li>
            </ul>
          </div>

          <div className="no-token">
            <p>Don't have a token yet?</p>
            <button 
              className="purchase-button"
              onClick={() => setShowPayment(true)}
            >
              🛒 Purchase Full Access - €19.99
            </button>
            <p className="purchase-note">
              Secure payment • Instant access • 1 year validity
            </p>
          </div>
        </div>

        {showPayment && (
          <StripePayment onClose={() => setShowPayment(false)} />
        )}
      </div>
    </div>
  );
};

export default TokenEntry;