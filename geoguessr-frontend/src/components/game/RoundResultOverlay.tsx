import React, { useEffect, useRef } from 'react';
import { MistbornButton } from '../ui/MistbornButton';
import './RoundResultOverlay.css';

interface RoundResultOverlayProps {
  guessLat: number;
  guessLon: number;
  actualLat: number;
  actualLon: number;
  distance: number; // in km
  points: number;
  onContinue: () => void;
}

declare global {
  interface Window {
    google: any;
  }
}

export const RoundResultOverlay: React.FC<RoundResultOverlayProps> = ({
  guessLat,
  guessLon,
  actualLat,
  actualLon,
  distance,
  points,
  onContinue,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const noGuess = distance >= 20000; // Player didn't make a guess

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;

    // If no guess, center on actual location, otherwise midpoint
    const centerLat = noGuess ? actualLat : (guessLat + actualLat) / 2;
    const centerLon = noGuess ? actualLon : (guessLon + actualLon) / 2;

    // Calculate appropriate zoom level based on distance
    let zoom = 2;
    if (noGuess) zoom = 5; // Default zoom when no guess
    else if (distance < 50) zoom = 10;
    else if (distance < 200) zoom = 8;
    else if (distance < 500) zoom = 6;
    else if (distance < 1000) zoom = 5;
    else if (distance < 2000) zoom = 4;
    else zoom = 3;

    // Create map
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: centerLat, lng: centerLon },
      zoom: zoom,
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: true,
      fullscreenControl: false,
    });

    // Only add guess marker if player made a guess
    if (!noGuess) {
      new window.google.maps.Marker({
        position: { lat: guessLat, lng: guessLon },
        map: map,
        label: {
          text: 'G',
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold',
        },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 15,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
    }

    // Add actual location marker (red)
    new window.google.maps.Marker({
      position: { lat: actualLat, lng: actualLon },
      map: map,
      label: {
        text: 'A',
        color: 'white',
        fontSize: '14px',
        fontWeight: 'bold',
      },
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 15,
        fillColor: '#EA4335',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
    });

    // Only draw line if player made a guess
    if (!noGuess) {
      new window.google.maps.Polyline({
        path: [
          { lat: guessLat, lng: guessLon },
          { lat: actualLat, lng: actualLon },
        ],
        geodesic: true,
        strokeColor: '#FFD700',
        strokeOpacity: 1.0,
        strokeWeight: 3,
        map: map,
      });
    }
  }, [guessLat, guessLon, actualLat, actualLon, distance, noGuess]);

  return (
    <div className="round-result-overlay">
      <div className="round-result-overlay__backdrop" />
      <div className="round-result-overlay__content">
        <h2 className="round-result-overlay__title">
          {noGuess ? "Time's Up!" : "Round Result"}
        </h2>

        {noGuess && (
          <div style={{
            color: 'rgba(255, 107, 107, 0.9)',
            fontSize: '1rem',
            textAlign: 'center',
            marginBottom: '1rem',
            fontFamily: 'Georgia, Times New Roman, serif',
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)',
          }}>
            You didn't make a guess in time!
          </div>
        )}

        <div className="round-result-overlay__stats">
          <div className="round-result-overlay__stat">
            <span className="round-result-overlay__stat-label">Distance:</span>
            <span className="round-result-overlay__stat-value">
              {noGuess ? '—' : `${distance.toFixed(2)} km`}
            </span>
          </div>
          <div className="round-result-overlay__stat">
            <span className="round-result-overlay__stat-label">Points:</span>
            <span className="round-result-overlay__stat-value">{points}</span>
          </div>
        </div>

        <div className="round-result-overlay__map">
          <div ref={mapRef} className="round-result-overlay__map-container" />
          <div className="round-result-overlay__legend">
            {!noGuess && (
              <div className="round-result-overlay__legend-item">
                <span className="round-result-overlay__legend-marker round-result-overlay__legend-marker--guess">G</span>
                <span>Your Guess</span>
              </div>
            )}
            <div className="round-result-overlay__legend-item">
              <span className="round-result-overlay__legend-marker round-result-overlay__legend-marker--actual">A</span>
              <span>Actual Location</span>
            </div>
          </div>
        </div>

        <div className="round-result-overlay__actions">
          <MistbornButton onClick={onContinue} fullWidth>
            Continue
          </MistbornButton>
        </div>
      </div>
    </div>
  );
};
