import React, { useState, useEffect } from 'react';

const LoadingScreen = ({ onLoaded }) => {
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 12) + 4;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        setTimeout(() => onLoaded(), 600);
      }
      setLoadingProgress(currentProgress);
    }, 150);

    return () => clearInterval(interval);
  }, [onLoaded]);

  return (
    <div className="loading-screen">
      <div className="loading-overlay"></div>
      <div className="loading-content">
        <img src="./logo.png" alt="Kalam Logo" className="loading-logo" />
        <h1 className="loading-text">Kalam</h1>
        <p className="loading-subtext">Awakening the magic of words...</p>
        
        <div className="loading-bar-wrapper">
          <div className="loading-bar-container">
            <div 
              className="loading-bar-progress" 
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
          <div className="loading-percentage">{loadingProgress}%</div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
