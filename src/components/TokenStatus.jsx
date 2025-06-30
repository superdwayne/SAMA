import React from 'react';
import { getRemainingDays } from '../utils/auth';
import './TokenStatus.css';

const TokenStatus = ({ onRenew }) => {
  const remainingDays = getRemainingDays();
  
  if (remainingDays > 7) {
    return null; // Don't show if more than 7 days remaining
  }
  
  const isExpiringSoon = remainingDays <= 3;
  const isExpired = remainingDays === 0;
  
  return (
    <div className={`token-status-alert ${isExpiringSoon ? 'warning' : ''} ${isExpired ? 'expired' : ''}`}>
      <div className="status-content">
        <span className="status-icon">
          {isExpired ? '❌' : '⚠️'}
        </span>
        <div className="status-message">
          {isExpired ? (
            <>
              <strong>Access Expired</strong>
              <p>Your 30-day access has expired. Purchase a new token to continue exploring.</p>
            </>
          ) : (
            <>
              <strong>Access Expiring Soon</strong>
              <p>Your access expires in {remainingDays} day{remainingDays !== 1 ? 's' : ''}.</p>
            </>
          )}
        </div>
        <button className="renew-button" onClick={onRenew}>
          {isExpired ? 'Purchase New Access' : 'Renew Now'}
        </button>
      </div>
    </div>
  );
};

export default TokenStatus;