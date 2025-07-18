import React from 'react';

const Success = () => {
  return (
    <div style={{ 
      padding: '40px 20px', 
      textAlign: 'center',
      minHeight: '100vh',
      background: '#f5f5f5',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        
        <h1 style={{ 
          color: '#3416D8', 
          marginBottom: '30px', 
          fontFamily: 'PPNeueMachina-PlainUltrabold, Arial, sans-serif', 
          fontSize: '29px' 
        }}>
          Payment Successful!
        </h1>
        
        <div style={{ 
          background: '#FAE0DF', 
          padding: '20px', 
          borderRadius: '10px',
          margin: '20px 0',
         
        }}>
          <h2 style={{ color: '#155724', marginBottom: '10px' }}>
            ✅ Your order is complete!
          </h2>
          <p style={{ color: '#155724', fontSize: '18px', margin: 0 }}>
            Check your email for your magic link to access the map
          </p>
        </div>
        
        <div style={{ 
          marginTop: '30px',
          padding: '20px',
          background: '#f8f9fa',
          borderRadius: '10px',
          textAlign: 'left'
        }}>
          <h3 style={{ color: '#333', marginBottom: '15px' }}>
            📧 What happens next?
          </h3>
          <ol style={{ 
            color: '#666', 
            fontSize: '16px',
            lineHeight: '1.8',
            paddingLeft: '20px'
          }}>
            <li>You'll receive an email with your magic link</li>
            <li>The email includes step-by-step instructions</li>
            <li>Click the magic link to unlock your purchased region(s)</li>
            <li>Your access is valid for 1 full year</li>
          </ol>
        </div>
        
        <div style={{ 
          background: '#fff3cd', 
          padding: '15px', 
          borderRadius: '8px',
          marginTop: '20px',
          border: '1px solid #ffeaa7'
        }}>
          <p style={{ margin: 0, color: '#856404' }}>
            <strong>🔍 Can't find the email?</strong><br/>
            Check your spam folder or contact support@streetartmapamsterdam.nl
          </p>
        </div>
        
        <div style={{ marginTop: '40px' }}>
          <a 
            href="/" 
            style={{ 
              display: 'inline-block',
              padding: '12px 30px',
              background: '#007bff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '5px',
              fontSize: '18px',
              fontWeight: '500'
            }}
          >
            ← Back to Map
          </a>
        </div>
      </div>
    </div>
  );
};

export default Success;
