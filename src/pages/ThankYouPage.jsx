import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/Success.css';

const ThankYouPage = () => {
  const navigate = useNavigate();

  const handleGotIt = () => {
    navigate('/');
  };

  return (
    <div className="success-container">
      <div className="success-card">
        
        {/* Header Section */}
        <div className="success-header">
          <h1 className="success-title">
            Payment<br/>Successful!
          </h1>
        </div>

        {/* Thank You Section */}
        <div className="success-thank-you">
          <h2>Thank you for your purchase!</h2>
          <p>
            We've sent a magic link to your<br/>
            email address.
          </p>
          <p>
            Check your inbox and click the<br/>
            link to unlock your map access.
          </p>
        </div>

        {/* Steps Section */}
        <div className="success-steps">
          
          {/* Step 1 */}
          <div className="success-step">
            <div className="success-step-number">1</div>
            <div className="success-step-content">
              <div className="success-step-title">Check your email</div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="success-step">
            <div className="success-step-number">2</div>
            <div className="success-step-content">
              <div className="success-step-title">Click the magic link</div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="success-step">
            <div className="success-step-number">3</div>
            <div className="success-step-content">
              <div className="success-step-title">Explore street art!</div>
            </div>
          </div>
        </div>

        {/* Bottom Action Button */}
        <div className="success-footer">
          <button
            className="success-button"
            onClick={handleGotIt}
          >
            Got it!
          </button>
        </div>

      </div>
    </div>
  );
};

export default ThankYouPage; 