// src/components/EmailMagicLink.jsx
import React, { useState } from 'react';
import ShoppingBagIcon from './ShoppingBagIcon';
import './EmailMagicLink.css';

const EmailMagicLink = ({ onSuccess, onClose }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [step, setStep] = useState('email'); // 'email' or 'sent'

  const handleSendMagicLink = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setMessage('Please enter your email address');
      return;
    }

    if (!isValidEmail(email)) {
      setMessage('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/send-magic-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email.toLowerCase().trim()
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setStep('sent');
        setMessage(result.message || 'Magic link sent to your email!');
      } else if (
        (response.status === 404 && result.code === 'NO_PURCHASE_FOUND') ||
        (response.status === 403 && result.code === 'PURCHASE_REQUIRED')
      ) {
        // Handle no purchase or purchase required
        setStep('no-purchase');
        setMessage(result.message);
      } else {
        setMessage(result.error || 'Failed to send magic link');
      }
    } catch (error) {
      console.error('Error sending magic link:', error);
      setMessage('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleTryAgain = () => {
    setStep('email');
    setMessage('');
    setEmail('');
  };

  const handlePurchaseRedirect = () => {
    // Close modal and redirect to payment page or show routes
    onClose();
    // You could add navigation logic here to show the routes for purchase
  };

  // No Purchase Found Step
  if (step === 'no-purchase') {
    return (
      <div className="magic-link-overlay">
        <div className="magic-link-modal">
          <div className="modal-header">
            <h2>🔍 No Purchase Found</h2>
            <button className="close-button" onClick={onClose}>✕</button>
          </div>
          
          <div className="modal-content">
            <div className="no-purchase-step">
              <div className="no-purchase-icon">
                <ShoppingBagIcon size={32} />
              </div>
              <h3>No Transaction Record</h3>
              <p>We couldn't find any purchases associated with:</p>
              <div className="email-display">{email}</div>
              
              <div className="explanation">
                <h4>What this means:</h4>
                <ul>
                  <li>This email hasn't been used for any map purchases</li>
                  <li>You can still access the free East region</li>
                  <li>Premium regions require a purchase first</li>
                </ul>
              </div>

              <div className="options">
                <h4>Your options:</h4>
                <div className="option-buttons">
                  <button onClick={onClose} className="primary-button">
                    🗺️ Explore Free Region
                  </button>
                  <button onClick={handlePurchaseRedirect} className="secondary-button">
                    🛒 View Premium Routes
                  </button>
                </div>
              </div>

              <div className="action-buttons">
                <button onClick={handleTryAgain} className="text-button">
                  Try Different Email
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'sent') {
    return (
      <div className="magic-link-overlay">
        <div className="magic-link-modal">
          <div className="modal-header">
            <h2>Check Your Email</h2>
            <button className="close-button" onClick={onClose}>✕</button>
          </div>
          <div className="modal-content">
            <div className="sent-card">
              <div className="sent-title">Magic Link Sent!</div>
              <div className="sent-email-label">We've sent a special access link to:</div>
              <div className="sent-email-display">{email}</div>
              <div className="sent-instructions-box">
                <h4>What to do next:</h4>
                <ul>
                  <li>Check your email inbox</li>
                  <li>Look for "Amsterdam Street Art Map Access"</li>
                  <li>Click the "Access Map" button in the email</li>
                  <li>You'll be automatically logged in!</li>
                </ul>
              </div>
              <button
                className="open-gmail-btn sent-primary-btn"
                onClick={() => window.open('https://mail.google.com/mail/u/0/#inbox', '_blank')}
                type="button"
              >
                Open Email App
              </button>
              <div className="open-gmail-tip sent-tip">
                If you use another mail app, please open it manually to find your magic link.
              </div>
              <div className="sent-action-buttons">
                <button onClick={handleTryAgain} className="secondary-button">
                  Use Different Email
                </button>
                <button onClick={onClose} className="primary-button">
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="magic-link-overlay">
      <div className="magic-link-modal">
        <div className="modal-header">
          <h2>🎨 Get Map Access</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-content">
          <div className="email-step">
            <h3>Email Me My Magic Link</h3>
            <p>Enter your email to get instant access to the Amsterdam Street Art Map</p>

            <form onSubmit={handleSendMagicLink} className="email-form">
              <div className="input-group">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="email-input"
                  disabled={isLoading}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="send-button"
                >
                  {isLoading ? 'Sending...' : 'Send Magic Link'}
                </button>
              </div>
            </form>

            {message && (
              <div className={`message ${message.includes('error') || message.includes('Failed') ? 'error' : 'info'}`}>
                {message}
              </div>
            )}
 </div>
<div className="info-box-container">
            <div className="info-box">
              <h4>🔍 What happens?</h4>
              <ul>
                <li>We check if you've purchased map access before</li>
                <li>You get an email with a special access link</li>
                <li>Click the link to unlock your maps instantly</li>
                <li>No passwords needed!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailMagicLink;
