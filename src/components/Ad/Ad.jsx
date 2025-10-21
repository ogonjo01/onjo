// src/components/Ad/Ad.jsx
import React from 'react';
import './Ad.css';

const Ad = ({ slot = 'content', format = 'auto', className = '' }) => {
  return (
    <div className={`ad-container ${className}`} style={{ height: '60px', overflow: 'hidden' }}>
      <ins
        className="adsbygoogle"
        style={{ height: '60px', maxHeight: '60px', overflow: 'hidden' }} // Lock height
        data-ad-client="ca-pub-7769353221684341"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
};

export default Ad;