// src/components/BottomAd/BottomAd.jsx
import React, { useEffect, useState } from 'react';
import './BottomAd.css';

const ADSENSE_CLIENT = 'ca-pub-7769353221684341';

const BottomAd = ({ slot = '', popupDelay = 15000 }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.warn('AdSense push failed:', e);
    }
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => setVisible(true), popupDelay);
  };

  if (!visible) return null;

  return (
    <div className="bottom-ad-wrapper">
      <button className="bottom-ad-close" onClick={handleClose}>×</button>
      <div className="bottom-ad-container">
        <ins
          className="adsbygoogle"
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        ></ins>
      </div>
    </div>
  );
};

export default BottomAd;