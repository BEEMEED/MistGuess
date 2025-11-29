import React from 'react';
import './RainEffect.css';

export const RainEffect: React.FC = () => {
  // Create rain drops using CSS
  const drops = Array.from({ length: 50 }, (_, i) => (
    <div
      key={i}
      className="rain-drop"
      style={{
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 2}s`,
        animationDuration: `${Math.random() * 0.5 + 0.5}s`,
      }}
    />
  ));

  return <div className="rain-container">{drops}</div>;
};
