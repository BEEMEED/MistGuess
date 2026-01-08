import React from 'react';
import './TargetLogo.css';

interface TargetLogoProps {
  size?: number;
  className?: string;
}

export const TargetLogo: React.FC<TargetLogoProps> = ({ size = 200, className = '' }) => {
  return (
    <div className={`target-logo ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        {/* Outer ring - rotates counterclockwise */}
        <g className="outer-ring">
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="rgba(120, 120, 120, 0.5)"
            strokeWidth="2"
          />
        </g>

        {/* Inner ring with crosshair - rotates clockwise */}
        <g className="inner-ring">
          <circle
            cx="100"
            cy="100"
            r="60"
            fill="none"
            stroke="rgba(160, 160, 160, 0.7)"
            strokeWidth="2"
          />
          {/* Crosshair lines */}
          <line x1="100" y1="40" x2="100" y2="160" stroke="rgba(160, 160, 160, 0.7)" strokeWidth="1" />
          <line x1="40" y1="100" x2="160" y2="100" stroke="rgba(160, 160, 160, 0.7)" strokeWidth="1" />
        </g>

        {/* Center dot */}
        <circle
          cx="100"
          cy="100"
          r="12"
          fill="rgba(140, 140, 140, 0.8)"
          className="center-dot"
        />
      </svg>
    </div>
  );
};
