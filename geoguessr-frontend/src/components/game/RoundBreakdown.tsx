import React, { useEffect, useRef } from 'react';
import type { RoundResult, PlayerInfo } from '../../types';
import './RoundBreakdown.css';

interface RoundBreakdownProps {
  round: RoundResult;
  players: PlayerInfo[];
  isExpanded: boolean;
  onToggle: () => void;
}

declare global {
  interface Window {
    google: any;
  }
}

export const RoundBreakdown: React.FC<RoundBreakdownProps> = ({
  round,
  players,
  isExpanded,
  onToggle,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);

  const getPlayerInfo = (login: string) => {
    const player = players.find((p) => p.login === login);
    return {
      name: player?.name || login,
      avatar: player?.avatar || '',
    };
  };

  useEffect(() => {
    if (!isExpanded || !mapRef.current || !window.google?.maps) return;

    const targetLocation = {
      lat: round.targetLocation.lat,
      lng: round.targetLocation.lon,
    };

    // Create map
    const map = new window.google.maps.Map(mapRef.current, {
      center: targetLocation,
      zoom: 4,
      mapTypeId: 'roadmap',
      streetViewControl: false,
      mapTypeControl: true,
      fullscreenControl: false,
      zoomControl: true,
    });

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

    round.guesses.forEach((guess, index) => {
      if (guess.lat === 0 && guess.lon === 0) return;

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
        title: `${getPlayerInfo(guess.player).name}: ${Math.round(guess.distance / 1000)} km`,
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
  }, [isExpanded, round, players]);

  return (
    <div className="breakdown-item">
      <div className="breakdown-header" onClick={onToggle}>
        <div className="breakdown-header-left">
          <span className="breakdown-round">Round {round.round}</span>
          <span className="breakdown-winner">
            Winner: {getPlayerInfo(round.winner.player).name}
          </span>
        </div>
        <button className="breakdown-toggle">
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {isExpanded && (
        <div className="breakdown-expanded">
          <div className="breakdown-map-container">
            <div ref={mapRef} className="breakdown-map" />
          </div>

          <div className="breakdown-players-list">
            <h4>Player Results</h4>
            {round.guesses
              .sort((a, b) => a.distance - b.distance)
              .map((guess, index) => (
                <div key={guess.player} className="breakdown-player-result">
                  <span className="breakdown-player-rank">#{index + 1}</span>
                  <span className="breakdown-player-name">
                    {getPlayerInfo(guess.player).name}
                  </span>
                  <span className="breakdown-player-distance">
                    {(guess.distance / 1000).toFixed(2)} km
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
