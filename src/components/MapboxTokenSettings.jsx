// src/components/MapboxTokenSettings.jsx
import React, { useState, useEffect } from 'react';
import { mapboxTokenManager } from '../utils/mapboxAuth';
import './MapboxTokenSettings.css';

const MapboxTokenSettings = ({ onTokenUpdate, onClose }) => {
  const [tokenInput, setTokenInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [showTokenInput, setShowTokenInput] = useState(false);

  useEffect(() => {
    // Load current token info
    const info = mapboxTokenManager.getTokenInfo();
    setTokenInfo(info);
  }, []);

  const handleValidateToken = async () => {
    if (!tokenInput.trim()) {
      setValidationResult({ valid: false, error: 'Please enter a token' });
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const result = await mapboxTokenManager.validateToken(tokenInput.trim());
      setValidationResult(result);
      
      if (result.valid) {
        // Save the token if valid
        const saved = mapboxTokenManager.saveCustomToken(tokenInput.trim());
        if (saved) {
          // Update token info
          const newInfo = mapboxTokenManager.getTokenInfo();
          setTokenInfo(newInfo);
          
          // Notify parent component
          if (onTokenUpdate) {
            onTokenUpdate(tokenInput.trim());
          }
          
          setTokenInput('');
          setShowTokenInput(false);
        }
      }
    } catch (error) {
      setValidationResult({ valid: false, error: 'Validation failed' });
    } finally {
      setIsValidating(false);
    }
  };

  const handleResetToDefault = () => {
    mapboxTokenManager.resetToDefault();
    const info = mapboxTokenManager.getTokenInfo();
    setTokenInfo(info);
    setValidationResult(null);
    
    if (onTokenUpdate) {
      onTokenUpdate(info.token);
    }
  };

  const handleRemoveCustomToken = () => {
    mapboxTokenManager.removeCustomToken();
    const info = mapboxTokenManager.getTokenInfo();
    setTokenInfo(info);
    setValidationResult(null);
    
    if (onTokenUpdate) {
      onTokenUpdate(info.token);
    }
  };

  return (
    <div className="mapbox-token-settings">
      <div className="settings-header">
        <h3>Mapbox Token Settings</h3>
        <button className="close-button" onClick={onClose}>✕</button>
      </div>

      <div className="settings-content">
        <div className="current-token-info">
          <h4>Current Token</h4>
          <div className="token-display">
            <div className="token-type">
              <span className={`token-badge ${tokenInfo?.type}`}>
                {tokenInfo?.type === 'custom' ? 'Custom Token' : 'Default Token'}
              </span>
            </div>
            <div className="token-value">
              <code>{tokenInfo?.masked}</code>
            </div>
            {tokenInfo?.type === 'custom' && tokenInfo?.daysRemaining !== null && (
              <div className="token-expiry">
                {tokenInfo.daysRemaining > 0 ? (
                  <span className="expiry-info">
                    Expires in {tokenInfo.daysRemaining} days
                  </span>
                ) : (
                  <span className="expiry-warning">Token expired</span>
                )}
              </div>
            )}
          </div>
        </div>

        {!showTokenInput ? (
          <div className="token-actions">
            <button 
              className="btn btn-primary"
              onClick={() => setShowTokenInput(true)}
            >
              Add Custom Token
            </button>
            
            {tokenInfo?.type === 'custom' && (
              <>
                <button 
                  className="btn btn-secondary"
                  onClick={handleResetToDefault}
                >
                  Use Default Token
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={handleRemoveCustomToken}
                >
                  Remove Custom Token
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="token-input-section">
            <h4>Add Custom Mapbox Token</h4>
            <p className="token-help">
              Enter your personal Mapbox access token. You can create one at{' '}
              <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer">
                account.mapbox.com/access-tokens
              </a>
            </p>
            
            <div className="input-group">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6..."
                className="token-input"
                disabled={isValidating}
              />
              <button
                onClick={handleValidateToken}
                disabled={isValidating || !tokenInput.trim()}
                className="btn btn-primary"
              >
                {isValidating ? 'Validating...' : 'Validate & Save'}
              </button>
            </div>

            <button 
              className="btn btn-secondary btn-cancel"
              onClick={() => {
                setShowTokenInput(false);
                setTokenInput('');
                setValidationResult(null);
              }}
            >
              Cancel
            </button>

            {validationResult && (
              <div className={`validation-result ${validationResult.valid ? 'success' : 'error'}`}>
                {validationResult.valid ? (
                  <span>✅ Token is valid and has been saved!</span>
                ) : (
                  <span>❌ {validationResult.error}</span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="token-info">
          <h4>About Mapbox Tokens</h4>
          <ul>
            <li>Free tier includes 50,000 map loads per month</li>
            <li>Custom tokens allow you to track your own usage</li>
            <li>Tokens can be restricted to specific domains for security</li>
            <li>Default token is shared and may have usage limits</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MapboxTokenSettings;
