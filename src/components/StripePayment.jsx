import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './StripePayment.css';

// IMPORTANT: Replace with your actual Full Access payment link
const FULL_ACCESS_PAYMENT_LINK = 'https://buy.stripe.com/test_xxx'; // Replace with your link

const StripePayment = ({ onClose }) => {
  const navigate = useNavigate();

  const handlePayment = () => {
    // Redirect directly to Stripe Payment Link
    // Stripe will collect email and handle everything
    window.location.href = FULL_ACCESS_PAYMENT_LINK;
  };

  return (
    <div className="stripe-payment-overlay">
      <div className="stripe-payment-modal">
        <button className="close-button" onClick={onClose}>✕</button>
        
        <div className="payment-header">
          <h2>🗺️ Unlock Full Map Access</h2>
          <p>Get instant access to all Amsterdam street art regions</p>
        </div>

        <div className="features-list">
          <div className="feature">
            <span className="feature-icon">🎨</span>
            <span>Access to all 6 districts</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🧭</span>
            <span>Turn-by-turn navigation</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🗺️</span>
            <span>Curated art routes</span>
          </div>
          <div className="feature">
            <span className="feature-icon">📍</span>
            <span>100+ street art locations</span>
          </div>
          <div className="feature">
            <span className="feature-icon">⏰</span>
            <span>1 year access</span>
          </div>
        </div>

        <div className="price-section">
          <div className="price">
            <span className="currency">€</span>
            <span className="amount">19.99</span>
            <span className="period">one-time</span>
          </div>
          <p className="price-note">One-time payment • 1 year access • Magic link sent via email</p>
        </div>

        <button 
          className="payment-button"
          onClick={handlePayment}
        >
          🔒 Secure Payment with Stripe
        </button>

        <div className="security-badges">
          <span>🔒 SSL Secured</span>
          <span>💳 Stripe Protected</span>
                          <span>📧 Magic Link via Email</span>
        </div>

        <p className="terms">
          By purchasing, you agree to our terms of service. 
                      No subscription required. You'll receive your magic link via email.
        </p>
      </div>
    </div>
  );
};

export default StripePayment;
