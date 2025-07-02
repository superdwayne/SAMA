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
          <p className="intro-text">
            Curated by Street Art Museum Amsterdam, a contemporary museum 
            showcasing murals and community projects that connect street art with 
            the city and its people.
          </p>

          <p className="description-text">
            Try out one of our street art routes and cruise through bold murals, 
            hidden gems and rebellious tags most folks totally miss. It's all 
            tucked away in alleys, corners and walls that have something to say.
          </p>

          <p className="closing-text">
            Walk, vibe and see the city like you've never seen it before.<br />
            All at your own pace.
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
              src="/af-logo.png" 
              alt="Amsterdam Fonds voor de Kunst" 
              className="footer-logo af-logo"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <img 
              src="/eu-logo.png" 
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
