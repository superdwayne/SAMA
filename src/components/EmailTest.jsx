import React, { useState } from 'react';
import './EmailTest.css';

const EmailTest = () => {
  const [email, setEmail] = useState('');
  const [region, setRegion] = useState('North');
  const [method, setMethod] = useState('sendgrid');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const regions = [
    'North', 'South', 'East', 'West', 
    'Centre', 'South-East', 'Nieuw-West'
  ];

  const sendTestEmail = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('http://localhost:3001/api/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, method }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to send test email');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendAccessToken = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('http://localhost:3001/api/email/send-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          region, 
          useNodemailer: method === 'nodemailer' 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to send access token');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="email-test-container">
      <div className="email-test-card">
        <h2>📧 Email Testing Dashboard</h2>
        <p>Test your email functionality for the Amsterdam Street Art Map</p>

        <div className="form-group">
          <label htmlFor="email">Email Address:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="region">Region:</label>
          <select
            id="region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            {regions.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="method">Email Method:</label>
          <select
            id="method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option value="sendgrid">SendGrid</option>
            <option value="nodemailer">Nodemailer (Gmail)</option>
          </select>
        </div>

        <div className="button-group">
          <button 
            onClick={sendTestEmail}
            disabled={!email || loading}
            className="test-button"
          >
            {loading ? '⏳ Sending...' : '🧪 Send Test Email'}
          </button>
          
          <button 
            onClick={sendAccessToken}
            disabled={!email || !region || loading}
            className="token-button"
          >
            {loading ? '⏳ Sending...' : '🗝️ Send Access Token'}
          </button>
        </div>

        {result && (
          <div className="result success">
            <h3>✅ Success!</h3>
            <p><strong>Message:</strong> {result.message}</p>
            <p><strong>Method:</strong> {result.method || result.emailMethod}</p>
            {result.token && (
              <p><strong>Token (Dev Only):</strong> <code>{result.token}</code></p>
            )}
          </div>
        )}

        {error && (
          <div className="result error">
            <h3>❌ Error</h3>
            <p>{error}</p>
          </div>
        )}

        <div className="info-section">
          <h3>📋 Instructions:</h3>
          <ul>
            <li><strong>Test Email:</strong> Sends a sample email to verify email service works</li>
            <li><strong>Access Token:</strong> Generates and sends a real access token for the selected region</li>
            <li><strong>SendGrid:</strong> Uses SendGrid API (requires SENDGRID_API_KEY in .env)</li>
            <li><strong>Nodemailer:</strong> Uses Gmail SMTP (requires EMAIL_USER and EMAIL_PASS in .env)</li>
          </ul>
          
          <div className="env-note">
            <h4>🔧 Required Environment Variables:</h4>
            <p><strong>For SendGrid:</strong> SENDGRID_API_KEY, SENDER_EMAIL</p>
            <p><strong>For Gmail:</strong> EMAIL_SERVICE=gmail, EMAIL_USER, EMAIL_PASS</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailTest;