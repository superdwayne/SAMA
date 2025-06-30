import React, { useState } from 'react';

const Success = () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const [inputToken, setInputToken] = useState(token || '');

  return (
    <div style={{
      maxWidth: 480,
      margin: '60px auto',
      padding: 32,
      background: '#f9fafb',
      borderRadius: 18,
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
      border: '2px solid #007cbf',
      textAlign: 'center',
      fontFamily: 'inherit',
    }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#007cbf', fontWeight: 900, fontSize: 32, marginBottom: 8 }}>Access Granted!</h1>
        <div style={{ fontSize: 18, color: '#333', marginBottom: 8 }}>Thank you for your purchase.</div>
        <div style={{ fontSize: 16, color: '#666' }}>Follow the steps below to unlock your map access.</div>
      </div>
      <div style={{
        background: '#fff',
        border: '2px solid #007cbf',
        borderRadius: 12,
        padding: 20,
        margin: '24px 0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <div style={{ fontSize: 16, color: '#007cbf', fontWeight: 700, marginBottom: 8 }}>Your Access Token</div>
        <div style={{
          fontWeight: 'bold',
          fontSize: 24,
          background: '#e3f2fd',
          color: '#1a237e',
          padding: '16px 24px',
          borderRadius: 8,
          letterSpacing: 1.5,
          marginBottom: 8,
          wordBreak: 'break-all',
          border: '1.5px solid #007cbf',
        }}>{token}</div>
        <div style={{ fontSize: 14, color: '#666', marginBottom: 0 }}>Copy this code to unlock your map access.</div>
      </div>
      <div style={{ textAlign: 'left', margin: '0 auto 24px auto', maxWidth: 340 }}>
        <ol style={{ color: '#333', fontSize: 16, paddingLeft: 20 }}>
          <li>Click the <b>Unlock Map</b> button below.</li>
          <li>Paste your access token in the field if it isn't pre-filled.</li>
          <li>Enjoy exploring Amsterdam's street art!</li>
        </ol>
      </div>
      <input
        type="text"
        value={inputToken}
        onChange={e => setInputToken(e.target.value)}
        style={{
          width: '100%',
          padding: 12,
          fontSize: 18,
          borderRadius: 8,
          border: '2px solid #007cbf',
          marginBottom: 18,
          background: '#fff',
          textAlign: 'center',
          fontWeight: 600,
          letterSpacing: 1.2,
        }}
        placeholder="Paste your access token here"
      />
      <button
        style={{
          background: '#007cbf',
          color: 'white',
          padding: '14px 32px',
          border: 'none',
          borderRadius: 8,
          fontWeight: 'bold',
          fontSize: '1.1rem',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
          marginBottom: 8,
        }}
        onClick={() => {
          window.location.href = `/token?token=${inputToken}`;
        }}
      >
        Unlock Map
      </button>
      <div style={{ fontSize: 13, color: '#888', marginTop: 12 }}>
        Lost your token? Check your payment confirmation page or contact support.
      </div>
    </div>
  );
};

export default Success; 