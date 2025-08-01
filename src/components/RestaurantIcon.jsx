import React from 'react';

const RestaurantIcon = ({ size = 24, className = '' }) => {
  return (
    <img 
      src="/images/restaurant.png"
      alt="Restaurant"
      width={size}
      height={size}
      className={className}
      style={{
        objectFit: 'contain'
      }}
    />
  );
};

export default RestaurantIcon; 