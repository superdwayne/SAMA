import React from 'react';

const ShoppingBagIcon = ({ size = 24, className = '' }) => {
  return (
    <img 
      src="https://img.icons8.com/external-others-phat-plus/100/external-bag-essential-blue-others-phat-plus.png"
      alt="Shopping Bag"
      width={size}
      height={size}
      className={className}
      style={{
        display: 'block',
        objectFit: 'contain'
      }}
    />
  );
};

export default ShoppingBagIcon; 