import React, { useEffect, useRef } from 'react';
import './AshParticles.css';

declare global {
  interface Window {
    particlesJS: any;
  }
}

export const AshParticles: React.FC = () => {
  // Temporarily disabled due to particles.js strict mode incompatibility
  // TODO: Replace with CSS-based particle effect or tsparticles library
  return null;
};
