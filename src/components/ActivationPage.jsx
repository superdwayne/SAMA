import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const ActivationPage = () => {
  const { linkId } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState('checking');
  const [message, setMessage] = useState('Checking activation link...');
  const [data, setData] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    checkActivationLink();
  }, [linkId]);

  const checkActivationLink = async () => {
    try {
      setStep('checking');
      setMessage('Checking activation link...');

      const response = await fetch(`/api/activate/${linkId}`);
      const result = await response.json();

      if (response.ok) {
        if (result.success) {
          handleActivationSuccess(result);
        } else if (result.requiresVerification) {
          setStep('verification');
          setData(result);
          setMessage('For security, we need to verify this is really you.');
          await sendVerificationCode();
        }
      } else {
        setStep('error');
        setMessage(result.error || 'Activation failed');
      }

    } catch (error) {
      setStep('error');
      setMessage('Connection error. Please try again.');
    }
  };

  const sendVerificationCode = async () => {
    try {
      await fetch('/api?action=verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkId,
          verificationAction: 'send_code'
        })
      });
      setMessage('Verification code sent to your email');
    } catch (error) {
      console.error('Failed to send verification code');
    }
  };

  const verifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      alert('Please enter a 6-digit verification code');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api?action=verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkId,
          verificationAction: 'verify_code',
          verificationCode
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        handleActivationSuccess(result);
      } else {
        alert(result.error || 'Invalid verification code');
      }
    } catch (error) {
      alert('Error verifying code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivationSuccess = (result) => {
    if (result.data.userSession) {
      localStorage.setItem('streetArtMapSession', JSON.stringify(result.data.userSession));
      
      const accessData = {
        email: result.data.email,
        expiresAt: new Date(result.data.expiresAt).getTime(),
        regions: [result.data.region],
        createdAt: Date.now(),
        activatedViaMagicLink: true
      };
      localStorage.setItem('streetArtMapTokenData', JSON.stringify(accessData));
      localStorage.setItem('unlockedRegions', JSON.stringify([result.data.region]));
    }

    setStep('success');
    setData(result.data);
    setMessage(`Successfully activated ${result.data.region} district access!`);

    setTimeout(() => {
      navigate('/', { replace: true });
    }, 3000);
  };

  const contactSupport = () => {
    window.location.href = 'mailto:info@streetartmuseumamsterdam.com?subject=Activation%20Problem';
  };

  const goToHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_#000] max-w-md w-full p-8 text-center">
        
        <div className="mb-6">
          <h1 className="text-3xl font-black uppercase tracking-wider mb-2">
            Street Art<br />Museum<br />Amsterdam
          </h1>
          <div className="w-16 h-1 bg-yellow-400 mx-auto"></div>
        </div>

        <div className="mb-6">
          {step === 'checking' && (
            <div className="animate-spin w-16 h-16 border-4 border-black border-t-yellow-400 rounded-full mx-auto"></div>
          )}
          
          {step === 'verification' && (
            <div className="w-16 h-16 bg-blue-500 border-4 border-black rounded-full mx-auto flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          )}
          
          {step === 'success' && (
            <div className="w-16 h-16 bg-green-500 border-4 border-black rounded-full mx-auto flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
          
          {step === 'error' && (
            <div className="w-16 h-16 bg-red-500 border-4 border-black rounded-full mx-auto flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>

        <h2 className="text-xl font-bold mb-4">
          {step === 'checking' && 'Checking Link...'}
          {step === 'verification' && '🔒 Security Verification'}
          {step === 'success' && '🎉 Access Activated!'}
          {step === 'error' && '❌ Activation Failed'}
        </h2>

        <p className="text-gray-700 mb-6">{message}</p>

        {step === 'verification' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 mb-3">
                We've sent a 6-digit code to your email address to verify this activation.
              </p>
              
              <input
                type="text"
                placeholder="Enter 6-digit code"
                maxLength="6"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center text-2xl font-mono font-bold border-2 border-black rounded-lg py-3 px-4 mb-4"
                style={{ letterSpacing: '8px' }}
              />
              
              <button
                onClick={verifyCode}
                disabled={isSubmitting || verificationCode.length !== 6}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-6 border-4 border-black rounded-lg shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] transition-all"
              >
                {isSubmitting ? 'Verifying...' : 'Verify & Activate'}
              </button>
            </div>

            <button
              onClick={sendVerificationCode}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Didn't receive the code? Resend
            </button>
          </div>
        )}

        {step === 'success' && data && (
          <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4 mb-6">
            <p className="font-bold text-yellow-800">🗺️ {data.region} District Unlocked!</p>
            <p className="text-sm text-yellow-700">
              Valid for {data.daysRemaining} more days
            </p>
            <p className="text-xs text-gray-600 mt-2">
              Redirecting to map in 3 seconds...
            </p>
          </div>
        )}

        <div className="space-y-3">
          {step === 'success' && (
            <button
              onClick={goToHome}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 border-4 border-black rounded-lg shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] transition-all"
            >
              🗺️ Go to Map
            </button>
          )}

          {step === 'error' && (
            <>
              <button
                onClick={checkActivationLink}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 px-6 border-4 border-black rounded-lg shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] transition-all"
              >
                🔄 Try Again
              </button>
              
              <button
                onClick={contactSupport}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 border-4 border-black rounded-lg shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] transition-all"
              >
                📧 Contact Support
              </button>
            </>
          )}

          <button
            onClick={goToHome}
            className="w-full bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 border-2 border-black rounded-lg transition-all"
          >
            🏠 Back to Home
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          Questions? Email us at info@streetartmuseumamsterdam.com
        </p>
      </div>
    </div>
  );
};

export default ActivationPage;
