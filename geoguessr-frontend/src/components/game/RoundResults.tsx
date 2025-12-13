import React, { useEffect, useRef, useState } from 'react';
import type { RoundResult, PlayerInfo } from '../../types';
import './RoundResults.css';

interface RoundResultsProps {
  result: RoundResult;
  onContinue: () => void;
  players: PlayerInfo[];
  currentHp: { [player_id: number]: number };
}

declare global {
  interface Window {
    google: any;
  }
}

export const RoundResults: React.FC<RoundResultsProps> = ({ result, onContinue, players, currentHp }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [countdown, setCountdown] = useState(1); // Reduced to 1s to match backend 5s total
  const [animationStage, setAnimationStage] = useState(0); // 0: points display, 1: attack, 2: damage, 3: results

  // Helper function to get player display name
  const getPlayerName = (user_id: number): string => {
    const player = players.find(p => p.user_id === user_id);
    return player?.name || `User${user_id}`;
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

  // Animation stages timing (total 5s to match backend)
  useEffect(() => {
    const timers: number[] = [];

    // Stage 0 -> 1: Show points for 2s, then start attack
    timers.push(setTimeout(() => setAnimationStage(1), 2000));

    // Stage 1 -> 2: Attack animation for 0.8s, then show damage
    timers.push(setTimeout(() => setAnimationStage(2), 2800));

    // Stage 2 -> 3: Show damage for 1.2s, then show full results
    timers.push(setTimeout(() => setAnimationStage(3), 4000));

    return () => timers.forEach(timer => clearTimeout(timer));
  }, []);

  useEffect(() => {
    if (animationStage < 3) return; // Don't start countdown until animation is done

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
  }, [onContinue, animationStage]);

  const winnerGuess = result.guesses.find(g => g.player === result.winner.player);
  const loserGuess = result.guesses.find(g => g.player !== result.winner.player);

  // Animation stages 0-2: Show damage animation
  if (animationStage < 3) {
    return (
      <div className="round-results-overlay">
        <div className="damage-animation-container">
          {/* Stage 0: Show both players' points */}
          <div className={`points-display ${animationStage >= 1 ? 'fade-out' : ''}`}>
            <div className="player-points winner-points">
              <div className="points-avatar">👑</div>
              <div className="points-info">
                <div className="points-name">{getPlayerName(result.winner.player)}</div>
                <div className="points-value">{winnerGuess?.points.toLocaleString() || 0}</div>
                <div className="points-label">points</div>
              </div>
            </div>

            <div className="vs-divider">VS</div>

            <div className="player-points loser-points">
              <div className="points-avatar">💔</div>
              <div className="points-info">
                <div className="points-name">{getPlayerName(loserGuess?.player || 0)}</div>
                <div className="points-value">{loserGuess?.points.toLocaleString() || 0}</div>
                <div className="points-label">points</div>
              </div>
            </div>
          </div>

          {/* Stage 1: Attack animation */}
          {animationStage >= 1 && (
            <div className={`attack-animation ${animationStage >= 2 ? 'fade-out' : ''}`}>
              <div className="attack-projectile">⚔️</div>
              <div className="attack-text">HIT!</div>
            </div>
          )}

          {/* Stage 2: Damage display */}
          {animationStage >= 2 && (
            <div className="damage-impact">
              <div className="impact-effect">💥</div>
              <div className="damage-number">-{result.damage}</div>
              <div className="damage-hp-label">HP DAMAGE</div>
              <div className="damage-victim">to {getPlayerName(loserGuess?.player || 0)}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Stage 3: Show full results with map
  return (
    <div className="round-results-overlay">
      <div className="round-results-container">
        <div className="round-results-header">
          <h2>Round Results</h2>
          <div className="damage-display">
            <span className="damage-value">-{result.damage} HP</span>
            <span className="damage-label">to {getPlayerName(loserGuess?.player || 0)}</span>
          </div>
        </div>

        <div className="round-results-content">
          <div className="results-map-container">
            <div ref={mapRef} className="results-map" />
          </div>

          <div className="results-list">
            <h3>Player Results</h3>
            <div className="results-items">
              {result.guesses
                .sort((a, b) => b.points - a.points)
                .map((guess) => {
                  const isWinner = guess.player === result.winner.player;
                  return (
                    <div
                      key={guess.player}
                      className={`result-item ${isWinner ? 'winner' : 'loser'}`}
                    >
                      <div className="result-rank">{isWinner ? '👑' : '💔'}</div>
                      <div className="result-player">{getPlayerName(guess.player)}</div>
                      <div className="result-stats">
                        <div className="result-distance">
                          {Math.round(guess.distance / 1000)} km
                        </div>
                        <div className="result-points">
                          {guess.points.toLocaleString()} pts
                        </div>
                        <div className="result-hp">
                          HP: {currentHp[guess.player] || 0}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="round-winner">
              <div className="winner-icon">⚔️</div>
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
