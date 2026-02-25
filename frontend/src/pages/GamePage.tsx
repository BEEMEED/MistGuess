import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { wsService } from '../services/websocket';
import './GamePage.css';

interface ToastNotification {
  id: number;
  message: string;
}

export const GamePage: React.FC = () => {
  const { user } = useAuth();
  const { gameState, submitGuess, endRound, sendMessage, chatMessages, isReconnecting } = useLobby();
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
  const [opponentPov, setOpponentPov] = useState<{ heading: number; pitch: number; zoom: number } | null>(null);
  const [opponentPosition, setOpponentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [opponentGuessPreview, setOpponentGuessPreview] = useState<{ lat: number; lng: number } | null>(null);
  const endRoundRef = React.useRef(endRound);
  const lastCameraUpdateRef = useRef<number>(0);
  const panoramaPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const spectateWsRef = useRef<WebSocket | null>(null);

  const handlePositionChange = useCallback((lat: number, lng: number) => {
    panoramaPositionRef.current = { lat, lng };
  }, []);

  const handlePovChange = useCallback((heading: number, pitch: number, zoom: number) => {
    const now = Date.now();
    if (now - lastCameraUpdateRef.current > 100 && user?.user_id) {
      lastCameraUpdateRef.current = now;
      const pos = panoramaPositionRef.current;
      wsService.sendCameraUpdate(heading, pitch, zoom, user.user_id, pos?.lat, pos?.lng);
    }
  }, [user?.user_id]);

  // Update ref when endRound changes
  useEffect(() => {
    endRoundRef.current = endRound;
  }, [endRound]);

  // Broadcast guess marker position to spectators in real-time
  useEffect(() => {
    if (!user?.user_id) return;
    wsService.sendGuessPreview(
      guessLocation?.lat ?? null,
      guessLocation?.lng ?? null,
      user.user_id
    );
  }, [guessLocation, user?.user_id]);

  // Connect to spectate WS to watch opponent after submitting guess
  useEffect(() => {
    if (!hasGuessed || !code || !user) {
      if (spectateWsRef.current) {
        spectateWsRef.current.close();
        spectateWsRef.current = null;
      }
      setOpponentPov(null);
      setOpponentPosition(null);
      setOpponentGuessPreview(null);
      return;
    }

    const ws = new WebSocket(`ws://localhost:8000/ws/${code}/spectate?token=${user.token}`);
    spectateWsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.num_player === user.user_id) return;
        if (data.type === 'spectate') {
          setOpponentPov({ heading: data.heading, pitch: data.pitch, zoom: data.zoom });
          if (data.lat != null && data.lng != null) {
            setOpponentPosition({ lat: data.lat, lng: data.lng });
          }
        } else if (data.type === 'guess_preview') {
          setOpponentGuessPreview(
            data.lat != null && data.lng != null ? { lat: data.lat, lng: data.lng } : null
          );
        }
      } catch {}
    };

    return () => {
      ws.close();
      spectateWsRef.current = null;
      setOpponentPov(null);
      setOpponentPosition(null);
      setOpponentGuessPreview(null);
    };
  }, [hasGuessed, code, user?.token, user?.user_id]);

  useEffect(() => {
    // Don't redirect while reconnecting or if gameState hasn't loaded yet
    if (isReconnecting || gameState === null) return;
    if (!gameState.isGameStarted && !gameState.isGameEnded && !showingResults) {
      navigate(`/lobby/${code}`);
    }
  }, [isReconnecting, gameState, gameState?.isGameStarted, gameState?.isGameEnded, showingResults, navigate, code]);

  useEffect(() => {
    // Navigate to final results when game ends
    if (gameState?.isGameEnded) {
      navigate(`/final/${code}`);
    }
  }, [gameState?.isGameEnded, navigate, code]);

  useEffect(() => {
    if (
      gameState?.roundResults &&
      gameState.roundResults.length > 0 &&
      !showingResults
    ) {
      const resultsCount = gameState.roundResults.length;

      if (resultsCount > lastShownResultRound) {
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
    // Close results overlay when new round starts, but only if it was shown
    if (showingResults) {
      setShowingResults(false);
    }
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
  const opponent = gameState.players.find(p => p.user_id !== user.user_id);

  useEffect(() => {
    if (isHost && allPlayersGuessed && gameState.isGameStarted && !roundEndTriggered && !showingResults) {
      setRoundEndTriggered(true);
      const timer = setTimeout(() => {
        endRoundRef.current();
      }, 2000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [isHost, allPlayersGuessed, gameState.isGameStarted, roundEndTriggered, showingResults]);

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

      {/* HP bars overlay - redesigned */}
      <div className="hp-panels-container">
        {gameState.players.map((player) => {
          const playerHp = gameState.hp[player.user_id] || gameState.hp[String(player.user_id)] || 0;
          const hpPercentage = (playerHp / 6000) * 100;
          const isCurrentUser = player.user_id === user.user_id;

          return (
            <div key={player.user_id} className={`hp-panel ${isCurrentUser ? 'hp-panel-left' : 'hp-panel-right'}`}>
              <div className="hp-panel-avatar">
                <img
                  src={player.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=667eea&color=fff&size=128&bold=true`}
                  alt={player.name}
                  className="hp-panel-avatar-img"
                />
                <div className="hp-panel-rank">
                  <div className="rank-badge-small">{player.rank}</div>
                </div>
              </div>

              <div className="hp-panel-content">
                <div className="hp-panel-name">{player.name}</div>
                <div className="hp-panel-bar-wrapper">
                  <div className="hp-panel-bar-bg">
                    <div
                      className={`hp-panel-bar-fill ${hpPercentage <= 25 ? 'hp-critical' : hpPercentage <= 50 ? 'hp-warning' : 'hp-healthy'}`}
                      style={{
                        width: `${Math.max(0, hpPercentage)}%`
                      }}
                    />
                    <div className="hp-panel-value">{Math.max(0, playerHp)}</div>
                  </div>
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
          {hasGuessed && !allPlayersGuessed && (
            <div className="watching-opponent-badge">👁 Watching {opponent?.name || 'opponent'}</div>
          )}
          {gameState.currentLocation ? (
            <StreetViewPanorama
              key={gameState.currentLocationIndex}
              lat={gameState.currentLocation.lat}
              lon={gameState.currentLocation.lon}
              onPovChange={hasGuessed ? undefined : handlePovChange}
              onPositionChange={hasGuessed ? undefined : handlePositionChange}
              externalPov={hasGuessed ? opponentPov : undefined}
              externalPosition={hasGuessed ? opponentPosition : undefined}
              disableControls={hasGuessed}
            />
          ) : (
            <div className="loading-streetview">
              <div className="mistborn-spinner"></div>
              <p>Loading location...</p>
            </div>
          )}
        </div>

        {/* Mini map: own guess before submitting, opponent's guess preview while waiting */}
        <GuessMap
          key={mapKey}
          onGuess={hasGuessed ? () => {} : handleMapGuess}
          guessLocation={hasGuessed ? opponentGuessPreview : guessLocation}
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
