import React from 'react';
import './InfoModal.css';

const InfoModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="info-modal-overlay" onClick={onClose}>
      <div className="info-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="header-row">
          <div className="header-left">
            <img src="images/sama-logo.png" alt="SAMA Logo" className="sama-logo" />
            <div className="header-text">
              <span className="modal-subtitle">Street Art</span>
              <span className="modal-subtitle">Museum</span>
              <span className="modal-subtitle">Amsterdam</span>
            </div>
          </div>
          <button className="close-button" onClick={onClose}>
            <span className="close-icon">×</span>
          </button>
        </div>

        {/* Main Title */}
        <h1 className="modal-main-title">
          UNLOCK<br />
          AMSTERDAM'S<br />
          STREET SECRETS!
        </h1>

        {/* Content */}
        <div className="modal-body">
          <p className="legal-text">
            The digital map and all associated content are the intellectual property of Stichting Street Art Museum Amsterdam and are protected under applicable copyright laws. All rights are reserved.
          </p>
          <p className="legal-text">
            While the content of this map is reviewed and updated on a monthly basis, users are advised that, due to the inherently ephemeral and dynamic nature of street art, certain works represented on the map may have been altered, relocated, or removed since the time of the most recent update. Stichting Street Art Museum Amsterdam makes no representations or warranties as to the continued existence, condition, or public accessibility of any artwork depicted.
          </p>
          <p className="legal-text">
            Unauthorised reproduction, distribution, or commercial use of the map or its contents, in whole or in part, is strictly prohibited without the prior written consent of Stichting Street Art Museum Amsterdam.
          </p>

          <div className="divider"></div>

          {/* Contact Section */}
          <div className="contact-section">
            <h3 className="contact-title">Contact us</h3>
            <a 
              href="mailto:answers@streetartmuseumamsterdam.com"
              className="contact-email"
            >
              answers@streetartmuseumamsterdam.com
            </a>
          </div>

          <div className="divider"></div>

          {/* Logos */}
          <div className="footer-logos">
            <img 
              src="/images/AFK-logo.png" 
              alt="Amsterdam Fonds voor de Kunst" 
              className="footer-logo af-logo"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <img 
              src="/images/EU-logo.png" 
              alt="European Union - Creative Europe Programme" 
              className="footer-logo eu-logo"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;
