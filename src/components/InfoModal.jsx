import React, { useEffect } from 'react';
import './InfoModal.css';

const InfoModal = ({ isOpen, onClose }) => {
  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="info-modal-overlay" onClick={onClose}>
      <div className="info-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="header-row">
          <div className="header-left">
            <img src="images/SAMA-logo-copy.png" alt="SAMA Logo" className="sama-logo" />
            <div className="header-text">
              <span className="modal-subtitle">Street Art</span>
              <span className="modal-subtitle">Museum</span>
              <span className="modal-subtitle">Amsterdam</span>
            </div>
          </div>
          <div className="header-right">
            <button className="close-button" onClick={onClose}>
              <span className="close-icon">×</span>
            </button>
          </div>
        </div>

        {/* Main Title */}
        <h1 className="modal-main-title modal-main-title-info">
          UNLOCK<br />
          AMSTERDAM'S<br />
          STREET SECRETS!
        </h1>

        {/* Content */}
        <div className="modal-body">
          <p className="description-text">
            Curated by Street Art Museum Amsterdam, a contemporary museum showcasing murals and community projects that connect street art with the city and its people.
          </p>
          <p className="description-text">
            Try out one of our street art routes and cruise through bold murals, hidden gems and rebellious tags most folks totally miss. It's all tucked away in alleys, corners and walls that have something to say.
          </p>
          <p className="description-text">
            Walk, vibe and see the city like you've never seen it before. All at your own pace.
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

          <p className="legal-text">
            The digital map and all associated content are the intellectual property of Stichting Street Art Museum Amsterdam and are protected under applicable copyright laws. All rights are reserved.
          </p>
          <p className="legal-text">
            While the content of this map is reviewed and updated on a monthly basis, users are advised that, due to the inherently ephemeral and dynamic nature of street art, certain works represented on the map may have been altered, relocated, or removed since the time of the most recent update. Stichting Street Art Museum Amsterdam makes no representations or warranties as to the continued existence, condition, or public accessibility of any artwork depicted.
          </p>
          <p className="legal-text">
            Unauthorised reproduction, distribution, or commercial use of the map or its contents, in whole or in part, is strictly prohibited without the prior written consent of Stichting Street Art Museum Amsterdam.
          </p>

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
              src="/images/EU-logo.jpg" 
              alt="Co funded by the European Union" 
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
