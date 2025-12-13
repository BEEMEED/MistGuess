import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLobby } from '../context/LobbyContext';
import { MistbornButton } from '../components/ui/MistbornButton';
import { MistbornCard } from '../components/ui/MistbornCard';
import { FogOverlay } from '../components/effects/FogOverlay';
import { StreetViewPanorama } from '../components/game/StreetViewPanorama';
import { GuessMap } from '../components/game/GuessMap';
import { Toast } from '../components/ui/Toast';
import { RoundResults } from '../components/game/RoundResults';
import { ChatBox } from '../components/ui/ChatBox';
import './GamePage.css';

interface ToastNotification {
  id: number;
  message: string;
}

export const GamePage: React.FC = () => {
  const { user } = useAuth();
  const { gameState, submitGuess, endRound, sendMessage, chatMessages } = useLobby();
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();

  const [guessLocation, setGuessLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hasGuessed, setHasGuessed] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [showingResults, setShowingResults] = useState(false);
  const [roundEndTriggered, setRoundEndTriggered] = useState(false);
  const [lastShownResultRound, setLastShownResultRound] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const endRoundRef = React.useRef(endRound);

  // Update ref when endRound changes
  useEffect(() => {
    endRoundRef.current = endRound;
  }, [endRound]);

  useEffect(() => {
    // Don't redirect if game ended or showing results
    if (!gameState?.isGameStarted && !gameState?.isGameEnded && !showingResults) {
      navigate(`/lobby/${code}`);
    }
  }, [gameState?.isGameStarted, gameState?.isGameEnded, showingResults, navigate, code]);

  useEffect(() => {
    // Navigate to final results when game ends
    if (gameState?.isGameEnded) {
      console.log('Game ended, navigating to final results');
      navigate(`/final/${code}`);
    }
  }, [gameState?.isGameEnded, navigate, code]);

  useEffect(() => {
    console.log('Checking if should show results overlay:', {
      hasResults: gameState?.roundResults && gameState.roundResults.length > 0,
      resultsLength: gameState?.roundResults?.length,
      currentLocationIndex: gameState?.currentLocationIndex,
      showingResults,
      lastShownResultRound,
    });

    if (
      gameState?.roundResults &&
      gameState.roundResults.length > 0 &&
      !showingResults
    ) {
      const resultsCount = gameState.roundResults.length;
      console.log('Latest result count:', resultsCount);
      console.log('Comparison:', {
        resultsCount,
        lastShownResultRound,
        shouldShow: resultsCount > lastShownResultRound,
      });

      if (resultsCount > lastShownResultRound) {
        console.log('SHOWING RESULTS OVERLAY!');
        setShowingResults(true);
        setLastShownResultRound(resultsCount);
      }
    }
  }, [gameState?.roundResults, showingResults, lastShownResultRound]);

  useEffect(() => {
    setHasGuessed(false);
    setGuessLocation(null);
    setMapKey((prev) => prev + 1);
    setRoundEndTriggered(false);
  }, [gameState?.currentLocationIndex]);

  // Reset roundEndTriggered when results are shown
  useEffect(() => {
    if (showingResults) {
      setRoundEndTriggered(false);
    }
  }, [showingResults]);

  // Timer countdown
  useEffect(() => {
    if (!gameState?.roundTimer || !gameState?.roundStartTime) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - gameState.roundStartTime!) / 1000);
      const remaining = Math.max(0, gameState.roundTimer! - elapsed);
      setTimeRemaining(remaining);

      if (remaining === 0) {
        // Time's up! Auto-submit if haven't guessed
        if (!hasGuessed && guessLocation) {
          handleSubmitGuess();
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);

    return () => clearInterval(interval);
  }, [gameState?.roundTimer, gameState?.roundStartTime, gameState?.currentLocationIndex, hasGuessed]);

  // Show notifications when players guess
  useEffect(() => {
    if (!gameState?.playersGuessed || !user) return;

    const latestPlayer = gameState.playersGuessed[gameState.playersGuessed.length - 1];

    // Don't show notification for current user's own guess
    if (latestPlayer && latestPlayer !== user.user_id.toString()) {
      const newToast: ToastNotification = {
        id: Date.now(),
        message: `${latestPlayer} made their guess!`,
      };
      setToasts((prev) => [...prev, newToast]);
    }
  }, [gameState?.playersGuessed, user]);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const handleMapGuess = (lat: number, lng: number) => {
    if (!hasGuessed) {
      setGuessLocation({ lat, lng });
    }
  };

  const handleSubmitGuess = () => {
    if (!guessLocation || hasGuessed) return;

    submitGuess(guessLocation.lat, guessLocation.lng);
    setHasGuessed(true);
  };

  const handleContinueFromResults = () => {
    console.log('Continuing from results, closing overlay');
    setShowingResults(false);
    // Backend automatically starts next round, no need to call startNextRound here
  };

  if (!gameState || !user) {
    return (
      <div className="game-page full-screen flex-center">
        <FogOverlay />
        <div className="mistborn-spinner"></div>
      </div>
    );
  }

  const isHost = gameState.host === user.user_id;
  const allPlayersGuessed =
    gameState.playersGuessed.length === gameState.players.length;

  // Debug logging
  console.log('GamePage state:', {
    isHost,
    allPlayersGuessed,
    playersGuessed: gameState.playersGuessed,
    totalPlayers: gameState.players,
    isGameStarted: gameState.isGameStarted,
    roundEndTriggered,
    showingResults,
  });

  // Auto-end round when all players have guessed (host only)
  // FIXED: added showingResults to dependencies to prevent double trigger
  useEffect(() => {
    console.log('useEffect triggered:', { 
      isHost, 
      allPlayersGuessed, 
      isGameStarted: gameState.isGameStarted, 
      roundEndTriggered,
      showingResults 
    });

    if (isHost && allPlayersGuessed && gameState.isGameStarted && !roundEndTriggered && !showingResults) {
      console.log('ALL CONDITIONS MET! Setting timer to auto-end round...');
      // Wait 2 seconds then automatically end round
      setRoundEndTriggered(true);
      const timer = setTimeout(() => {
        console.log('Timer fired! Calling endRound via ref');
        endRoundRef.current();
      }, 2000);

      return () => {
        console.log('Cleanup: clearing timer');
        clearTimeout(timer);
      };
    }
  }, [isHost, allPlayersGuessed, gameState.isGameStarted, roundEndTriggered, showingResults]);

  console.log('GamePage render - about to render GuessMap:', { mapKey, guessLocation, hasGuessed });

  return (
    <div className="game-page">
      <FogOverlay />

      {/* Time warning overlay - intensifying fog/vignette */}
      {timeRemaining !== null && timeRemaining <= 30 && (
        <div
          className="time-warning-overlay"
          style={{
            opacity: Math.max(0, 1 - (timeRemaining / 30)),
          }}
        />
      )}

      {/* Toast notifications */}
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            position: 'fixed',
            top: `${80 + index * 80}px`,
            right: '20px',
            zIndex: 9999,
          }}
        >
          <Toast message={toast.message} onClose={() => removeToast(toast.id)} />
        </div>
      ))}

      {/* HP bars overlay - top left */}
      <div className="hp-bars-overlay">
        {gameState.players.map((player) => {
          const playerHp = gameState.hp[player.user_id] || 0;
          const hpPercentage = (playerHp / 6000) * 100;
          const isCurrentUser = player.user_id === user.user_id;

          return (
            <div key={player.user_id} className={`hp-bar-container ${isCurrentUser ? 'current-user' : ''}`}>
              <div className="hp-bar-avatar">
                <img
                  src={player.avatar || '/default-avatar.png'}
                  alt={player.name}
                  className="hp-avatar-image"
                />
              </div>
              <div className="hp-bar-content">
                <div className="hp-bar-info">
                  <span className="hp-player-name">{player.name}</span>
                  <span className="hp-value">{Math.max(0, playerHp)}</span>
                </div>
                <div className="hp-bar-background">
                  <div
                    className="hp-bar-fill"
                    style={{
                      width: `${Math.max(0, hpPercentage)}%`,
                      backgroundColor: hpPercentage > 50 ? '#22c55e' : hpPercentage > 25 ? '#eab308' : '#ef4444'
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Timer overlay - top center */}
      {timeRemaining !== null && (
        <div className={`timer-overlay ${timeRemaining <= 10 ? 'timer-warning' : ''}`}>
          <div className="timer-icon">⏱</div>
          <span className="timer-value">
            {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
          </span>
        </div>
      )}

      {/* Players status overlay - top right */}
      <div className="players-overlay">
        {gameState.players.map((player) => (
          <div
            key={player.user_id}
            className={`player-status ${
              gameState.playersGuessed.includes(player.user_id.toString()) ? 'guessed' : ''
            }`}
            title={player.name}
          >
            {player.name.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>

      <div className="game-content">
        <div className="streetview-panel-fullscreen">
          {gameState.currentLocation ? (
            <StreetViewPanorama
              key={gameState.currentLocationIndex}
              lat={gameState.currentLocation.lat}
              lon={gameState.currentLocation.lon}
            />
          ) : (
            <div className="loading-streetview">
              <div className="mistborn-spinner"></div>
              <p>Loading location...</p>
            </div>
          )}
        </div>

        {/* Mini map with hover expand */}
        <GuessMap
          key={mapKey}
          onGuess={handleMapGuess}
          guessLocation={guessLocation}
          hasGuessed={hasGuessed}
        />

        {/* Guess controls panel */}
        <div className="guess-controls-panel">
          <MistbornCard className="controls-container" hover={false}>
            <div className="map-actions">
              {!hasGuessed ? (
                <MistbornButton
                  variant="danger"
                  fullWidth
                  onClick={handleSubmitGuess}
                  disabled={!guessLocation}
                  className={guessLocation ? 'metallic-pulse' : ''}
                >
                  Submit Guess
                </MistbornButton>
              ) : (
                <div className="waiting-status">
                  <span className="success-message">Guess submitted!</span>
                  {!allPlayersGuessed ? (
                    <span className="waiting-text">
                      Waiting for other players...
                      <div className="typing-indicator">
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                      </div>
                    </span>
                  ) : (
                    <span className="waiting-text">
                      Loading results...
                      <div className="typing-indicator">
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                      </div>
                    </span>
                  )}
                </div>
              )}
            </div>

            {guessLocation && !hasGuessed && (
              <div className="guess-coords">
                Lat: {guessLocation.lat.toFixed(2)}, Lng: {guessLocation.lng.toFixed(2)}
              </div>
            )}
          </MistbornCard>
        </div>
      </div>

      {showingResults && gameState.roundResults.length > 0 && (
        <RoundResults
          result={gameState.roundResults[gameState.roundResults.length - 1]}
          onContinue={handleContinueFromResults}
          players={gameState.players}
          currentHp={gameState.hp}
        />
      )}

      {/* Chat box */}
      <ChatBox
        messages={chatMessages}
        onSendMessage={sendMessage}
        currentUser={user.user_id.toString()}
      />
    </div>
  );
};
