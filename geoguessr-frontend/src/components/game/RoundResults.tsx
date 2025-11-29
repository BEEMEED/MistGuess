import React, { useEffect, useRef, useState } from 'react';
import type { RoundResult, PlayerInfo } from '../../types';
import './RoundResults.css';

interface RoundResultsProps {
  result: RoundResult;
  onContinue: () => void;
  players: PlayerInfo[];
  nextRoundTime?: number; // Server timestamp when next round starts
}

declare global {
  interface Window {
    google: any;
  }
}

export const RoundResults: React.FC<RoundResultsProps> = ({ result, onContinue, players, nextRoundTime }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [countdown, setCountdown] = useState(5);

  // Helper function to get player display name
  const getPlayerName = (login: string): string => {
    const player = players.find(p => p.login === login);
    return player?.name || login;
  };

  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current || !window.google?.maps) {
        return;
      }

      const targetLocation = {
        lat: result.targetLocation.lat,
        lng: result.targetLocation.lon,
      };

      // Create map
      const map = new window.google.maps.Map(mapRef.current, {
        center: targetLocation,
        zoom: 4,
        mapTypeId: 'roadmap',
        streetViewControl: false,
        mapTypeControl: true,
        fullscreenControl: true,
        zoomControl: true,
      });

      mapInstanceRef.current = map;

      // Add target location marker (green)
      new window.google.maps.Marker({
        position: targetLocation,
        map: map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 15,
          fillColor: '#00ff00',
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        label: {
          text: '★',
          color: 'white',
          fontSize: '16px',
          fontWeight: 'bold',
        },
        title: 'Target Location',
      });

      // Add guess markers and lines for each player
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(targetLocation);

      result.guesses.forEach((guess, index) => {
        if (guess.lat === 0 && guess.lon === 0) {
          // Skip if no guess coordinates (backend doesn't send them yet)
          return;
        }

        const guessLocation = {
          lat: guess.lat,
          lng: guess.lon,
        };

        // Add guess marker (red)
        new window.google.maps.Marker({
          position: guessLocation,
          map: map,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#ff0000',
            fillOpacity: 0.8,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
          label: {
            text: (index + 1).toString(),
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold',
          },
          title: `${getPlayerName(guess.player)}: ${Math.round(guess.distance / 1000)} km`,
        });

        // Draw line from guess to target
        new window.google.maps.Polyline({
          path: [guessLocation, targetLocation],
          geodesic: true,
          strokeColor: '#ff0000',
          strokeOpacity: 0.5,
          strokeWeight: 2,
          map: map,
        });

        bounds.extend(guessLocation);
      });

      // Fit map to show all markers
      map.fitBounds(bounds);
    };

    if (window.google?.maps) {
      initMap();
    } else {
      const checkGoogleMaps = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(checkGoogleMaps);
          initMap();
        }
      }, 100);

      return () => clearInterval(checkGoogleMaps);
    }
  }, [result]);

  // Auto-continue using server-synced time
  useEffect(() => {
    if (!nextRoundTime) {
      // Fallback to old behavior if server doesn't send nextRoundTime
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onContinue();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }

    // Use server time for synchronized countdown
    const updateCountdown = () => {
      const now = Date.now();
      const remaining = Math.ceil((nextRoundTime - now) / 1000);

      if (remaining <= 0) {
        setCountdown(0);
        onContinue();
      } else {
        setCountdown(remaining);
      }
    };

    updateCountdown(); // Initial update
    const interval = setInterval(updateCountdown, 100); // Update frequently for accuracy

    return () => clearInterval(interval);
  }, [nextRoundTime, onContinue]);

  return (
    <div className="round-results-overlay">
      <div className="round-results-container">
        <div className="round-results-header">
          <h2>Round {result.round} Results</h2>
        </div>

        <div className="round-results-content">
          <div className="results-map-container">
            <div ref={mapRef} className="results-map" />
          </div>

          <div className="results-list">
            <h3>Player Results</h3>
            <div className="results-items">
              {result.guesses
                .sort((a, b) => a.distance - b.distance)
                .map((guess, index) => (
                  <div
                    key={guess.player}
                    className={`result-item ${index === 0 ? 'winner' : ''}`}
                  >
                    <div className="result-rank">#{index + 1}</div>
                    <div className="result-player">{getPlayerName(guess.player)}</div>
                    <div className="result-distance">
                      {Math.round(guess.distance / 1000)} km
                    </div>
                  </div>
                ))}
            </div>

            <div className="round-winner">
              <div className="winner-icon">👑</div>
              <div className="winner-text">
                <strong>{getPlayerName(result.winner.player)}</strong> wins this round!
              </div>
            </div>
          </div>
        </div>

        <div className="round-results-footer">
          <div className="countdown-text">
            Next round starts in {countdown}s...
          </div>
        </div>
      </div>
    </div>
  );
};
