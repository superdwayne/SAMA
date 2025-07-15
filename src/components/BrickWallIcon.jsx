import React from 'react';

const BrickWallIcon = ({ size = 24, className = '' }) => {
  return (
    <img 
      src="/images/brick-wall.svg"
      alt="Brick Wall"
      width={size}
      height={size}
      className={className}
      style={{
       
        objectFit: 'contain'
      }}
    />
  );
};

export default BrickWallIcon; 