import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLobby } from '../context/LobbyContext';
import { MistbornButton } from '../components/ui/MistbornButton';
import { MistbornCard } from '../components/ui/MistbornCard';
import { FogOverlay } from '../components/effects/FogOverlay';
import { AshParticles } from '../components/effects/AshParticles';
import './RoundResultsPage.css';

export const RoundResultsPage: React.FC = () => {
  const { user } = useAuth();
  const { gameState, startNextRound, endGame } = useLobby();
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();

  useEffect(() => {
    if (gameState?.isGameEnded) {
      navigate(`/final/${code}`);
    }
  }, [gameState?.isGameEnded, navigate, code]);

  // Auto-navigate all players when round starts (detect by currentLocation change)
  useEffect(() => {
    if (gameState?.currentLocation && gameState.isGameStarted && !gameState.isGameEnded) {
      // If there's a current location and we're on results page, navigate to game
      const currentRoundResult = gameState.roundResults[gameState.roundResults.length - 1];
      if (currentRoundResult && currentRoundResult.round < gameState.currentRound) {
        // New round has started
        navigate(`/game/${code}`);
      }
    }
  }, [gameState?.currentLocation, gameState?.currentRound, gameState?.isGameStarted, gameState?.isGameEnded, navigate, code]);

  if (!gameState || !user) {
    return (
      <div className="results-page full-screen flex-center">
        <FogOverlay />
        <AshParticles />
        <div className="mistborn-spinner"></div>
      </div>
    );
  }

  const isHost = gameState.host === user.user_id;
  const currentRoundResult = gameState.roundResults[gameState.roundResults.length - 1];
  const isLastRound = gameState.currentRound >= gameState.totalRounds;

  const getPlayerName = (user_id: number): string => {
    const player = gameState.players.find((p) => p.user_id === user_id);
    return player?.name || `User${user_id}`;
  };

  if (!currentRoundResult) {
    return (
      <div className="results-page full-screen flex-center">
        <FogOverlay />
        <AshParticles />
        <div className="mistborn-spinner"></div>
      </div>
    );
  }

  const handleNext = () => {
    if (isLastRound) {
      endGame();
    } else {
      startNextRound();
      navigate(`/game/${code}`);
    }
  };

  // Auto-start next round or show final results after 5 seconds (host only)
  useEffect(() => {
    if (isHost) {
      const timer = setTimeout(() => {
        if (isLastRound) {
          endGame();
        } else {
          startNextRound();
          navigate(`/game/${code}`);
        }
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isHost, isLastRound, startNextRound, endGame, navigate, code]);

  const sortedResults = [...currentRoundResult.guesses].sort(
    (a, b) => a.distance - b.distance
  );

  return (
    <div className="results-page">
      <FogOverlay />
      <AshParticles />

      <div className="results-content">
        <div className="results-header fade-in">
          <h1 className="results-title">Round {currentRoundResult.round} Results</h1>
          <p className="results-subtitle">The mists reveal the truth...</p>
        </div>

        <div className="results-main">
          <MistbornCard className="winner-card slide-up glow-effect victory-glow">
            <h2 className="winner-title">Round Winner</h2>
            <div className="winner-info">
              <div className="winner-icon">
                {getPlayerName(currentRoundResult.winner.player).charAt(0).toUpperCase()}
              </div>
              <div className="winner-details">
                <div className="winner-name">{getPlayerName(currentRoundResult.winner.player)}</div>
                <div className="winner-distance">
                  {(currentRoundResult.winner.distance / 1000).toFixed(2)} km away
                </div>
              </div>
            </div>
          </MistbornCard>

          <MistbornCard className="scoreboard-card slide-up">
            <h2 className="scoreboard-title">All Results</h2>
            <div className="scoreboard-list">
              {sortedResults.map((result, index) => (
                <div
                  key={result.player}
                  className={`scoreboard-item fade-in ${
                    result.player === user.user_id ? 'current-user' : ''
                  } ${index === 0 ? 'first-place' : ''}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="scoreboard-rank">#{index + 1}</div>
                  <div className="scoreboard-player">
                    <div className="scoreboard-icon">
                      {getPlayerName(result.player).charAt(0).toUpperCase()}
                    </div>
                    <div className="scoreboard-name">{getPlayerName(result.player)}</div>
                  </div>
                  <div className="scoreboard-distance">
                    {(result.distance / 1000).toFixed(2)} km
                  </div>
                </div>
              ))}
            </div>
          </MistbornCard>

          <MistbornCard className="location-card slide-up">
            <h2 className="location-title">Target Location</h2>
            <div className="location-coords">
              <div className="coord-item">
                <span className="coord-label">Latitude:</span>
                <span className="coord-value">
                  {currentRoundResult.targetLocation.lat.toFixed(4)}
                </span>
              </div>
              <div className="coord-item">
                <span className="coord-label">Longitude:</span>
                <span className="coord-value">
                  {currentRoundResult.targetLocation.lon.toFixed(4)}
                </span>
              </div>
            </div>
          </MistbornCard>
        </div>

        <div className="results-actions">
          {isHost ? (
            <MistbornButton
              variant="danger"
              onClick={handleNext}
              className="metallic-pulse"
            >
              {isLastRound ? 'Show Final Results' : 'Next Round'}
            </MistbornButton>
          ) : (
            <div className="waiting-host">
              <span>Waiting for host to continue...</span>
              <div className="typing-indicator">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
