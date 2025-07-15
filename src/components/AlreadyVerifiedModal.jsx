import React from 'react';
import './AlreadyVerifiedModal.css';

const AlreadyVerifiedModal = ({ isOpen, onClose, userEmail }) => {
  if (!isOpen) return null;

  return (
    <div className="already-verified-overlay">
      <div className="already-verified-modal">
        <div className="modal-header">
          <div className="success-icon">✅</div>
          <h2>Welcome Back!</h2>
        </div>
        
        <div className="modal-content">
          <p className="welcome-message">
            You're already signed in and have access to the Amsterdam Street Art Map!
          </p>
          
          {userEmail && (
            <p className="email-info">
              Signed in as: <strong>{userEmail}</strong>
            </p>
          )}
          
          <div className="access-info">
            <p>You can continue exploring:</p>
            <ul>
              <li>🗺️ All unlocked regions</li>
              <li>🎨 Street art locations</li>
              <li>🏛️ Galleries and museums</li>
              <li>🧱 Legal graffiti walls</li>
            </ul>
          </div>
        </div>
        
        <div className="modal-actions">
          <button className="continue-btn" onClick={onClose}>
            Continue Exploring
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlreadyVerifiedModal; 