import React, { useState } from 'react';
import './TokenTest.css';

const TokenTest = ({ setUnlockedRegions }) => {
  const [email, setEmail] = useState('');
  const [region, setRegion] = useState('North');
  const [generatedToken, setGeneratedToken] = useState('');
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const regions = [
    'North', 'South', 'East', 'West', 
    'Centre', 'South-East', 'Nieuw-West'
  ];

  // Generate a test token
  const generateTestToken = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/test/generate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, region }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setGeneratedToken(data.token);
        setTestResults({
          type: 'success',
          message: `Test token generated successfully!`,
          details: data
        });
      } else {
        setTestResults({
          type: 'error',
          message: data.error || 'Failed to generate token'
        });
      }
    } catch (error) {
      setTestResults({
        type: 'error',
        message: 'Network error: ' + error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Test token validation
  const testTokenValidation = async () => {
    if (!generatedToken || !email) {
      setTestResults({
        type: 'error',
        message: 'Please generate a token first'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/token/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: generatedToken, email }),
      });

      const data = await response.json();
      
      if (response.ok && data.valid) {
        setTestResults({
          type: 'success',
          message: `Token validation successful! Access granted to ${data.region}`,
          details: data
        });
        
        // Simulate unlocking the region in the app
        if (setUnlockedRegions) {
          setUnlockedRegions(prev => {
            if (!prev.includes(data.region)) {
              return [...prev, data.region];
            }
            return prev;
          });
        }
      } else {
        setTestResults({
          type: 'error',
          message: data.error || 'Token validation failed'
        });
      }
    } catch (error) {
      setTestResults({
        type: 'error',
        message: 'Network error: ' + error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Simulate the full payment flow
  const simulatePaymentFlow = async () => {
    setLoading(true);
    setTestResults(null);
    
    try {
      // Step 1: Generate token (simulating payment)
      console.log('🎯 Step 1: Simulating payment and token generation...');
      
      const generateResponse = await fetch('http://localhost:3001/api/test/generate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, region }),
      });

      const generateData = await generateResponse.json();
      
      if (!generateResponse.ok) {
        throw new Error(generateData.error || 'Failed to generate token');
      }

      const token = generateData.token;
      setGeneratedToken(token);
      
      // Step 2: Small delay to simulate payment processing
      console.log('💳 Step 2: Payment processing...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 3: Validate token (simulating customer activation)
      console.log('🔑 Step 3: Customer activating token...');
      
      const validateResponse = await fetch('http://localhost:3001/api/token/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email }),
      });

      const validateData = await validateResponse.json();
      
      if (validateResponse.ok && validateData.valid) {
        setTestResults({
          type: 'success',
          message: `🎉 Complete payment flow test successful!`,
          details: {
            step1: 'Token generated ✅',
            step2: 'Payment processed ✅', 
            step3: 'Token validated ✅',
            region: validateData.region,
            token: token
          }
        });
        
        // Unlock region in the app
        if (setUnlockedRegions) {
          setUnlockedRegions(prev => {
            if (!prev.includes(validateData.region)) {
              return [...prev, validateData.region];
            }
            return prev;
          });
        }
      } else {
        throw new Error(validateData.error || 'Token validation failed');
      }
      
    } catch (error) {
      setTestResults({
        type: 'error',
        message: 'Payment flow test failed: ' + error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="token-test-container">
      <div className="token-test-card">
        <h2>🧪 Access Token Testing</h2>
        <p>Test the token generation and validation system before implementing Stripe payments</p>

        <div className="form-section">
          <div className="form-group">
            <label htmlFor="email">Email Address:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@example.com"
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

          {generatedToken && (
            <div className="token-display">
              <label>Generated Token:</label>
              <div className="token-value">
                <code>{generatedToken}</code>
                <button 
                  onClick={() => navigator.clipboard.writeText(generatedToken)}
                  className="copy-button"
                  title="Copy token"
                >
                  📋
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="test-buttons">
          <button 
            onClick={generateTestToken}
            disabled={!email || loading}
            className="generate-button"
          >
            {loading ? '⏳ Generating...' : '🔑 Generate Test Token'}
          </button>
          
          <button 
            onClick={testTokenValidation}
            disabled={!generatedToken || !email || loading}
            className="validate-button"
          >
            {loading ? '⏳ Validating...' : '✅ Test Token Validation'}
          </button>
          
          <button 
            onClick={simulatePaymentFlow}
            disabled={!email || loading}
            className="simulate-button"
          >
            {loading ? '⏳ Simulating...' : '🎯 Simulate Full Payment Flow'}
          </button>
        </div>

        {testResults && (
          <div className={`test-results ${testResults.type}`}>
            <h3>{testResults.type === 'success' ? '✅ Success!' : '❌ Error'}</h3>
            <p><strong>Message:</strong> {testResults.message}</p>
            
            {testResults.details && (
              <div className="results-details">
                <h4>Details:</h4>
                <pre>{JSON.stringify(testResults.details, null, 2)}</pre>
              </div>
            )}
          </div>
        )}

        <div className="test-info">
          <h3>📋 Test Options:</h3>
          <ul>
            <li><strong>Generate Test Token:</strong> Creates a token for the specified region</li>
            <li><strong>Test Token Validation:</strong> Validates the generated token</li>
            <li><strong>Simulate Full Payment Flow:</strong> Tests the complete end-to-end process</li>
          </ul>
          
          <div className="api-info">
            <h4>🔌 API Endpoints Being Tested:</h4>
            <p><code>POST /api/test/generate-token</code> - Generate test tokens</p>
            <p><code>POST /api/token/validate</code> - Validate access tokens</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenTest;