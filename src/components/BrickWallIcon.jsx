import React from 'react';

const BrickWallIcon = ({ size = 24, className = '' }) => {
  return (
    <img 
      src="https://cdn4.iconfinder.com/data/icons/man-and-a-wall/466/wall-3-1024.png"
      alt="Legal Wall"
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