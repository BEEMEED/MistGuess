import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLobby } from '../context/LobbyContext';
import { MistbornButton } from '../components/ui/MistbornButton';
import { MistbornCard } from '../components/ui/MistbornCard';
import { Avatar } from '../components/ui/Avatar';
import { RankBadge } from '../components/ui/RankBadge';
import { FogOverlay } from '../components/effects/FogOverlay';
import { AshParticles } from '../components/effects/AshParticles';
import './LobbyPage.css';

export const LobbyPage: React.FC = () => {
  const { user } = useAuth();
  const { gameState, startGame, leaveLobby, joinLobby, isConnected } = useLobby();
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();

  const [copied, setCopied] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const joinAttemptedRef = useRef<string | null>(null);
  const autoStartAttemptedRef = useRef(false);

  // Auto-join lobby if not already in it
  useEffect(() => {
    const autoJoin = async () => {
      if (!user || !code) return;

      // Prevent duplicate join attempts for the same lobby
      if (joinAttemptedRef.current === code) return;

      // If we don't have gameState or the lobby code doesn't match, join the lobby
      if (!gameState || gameState.lobbyCode !== code) {
        try {
          joinAttemptedRef.current = code;
          setJoinError(null);

          // Check if this is a reconnect
          const isReconnect = searchParams.get('reconnect') === 'true';
          console.log('Joining lobby:', { code, isReconnect });

          await joinLobby(code, isReconnect);
        } catch (err: any) {
          console.error('Failed to join lobby:', err);

          // Show error message
          setJoinError(err.message || 'Failed to join lobby');
          joinAttemptedRef.current = null;
        }
      }
    };

    autoJoin();
  }, [user, code, gameState?.lobbyCode, joinLobby, searchParams]);

  useEffect(() => {
    if (gameState?.isGameStarted) {
      navigate(`/game/${code}`);
    }
  }, [gameState?.isGameStarted, navigate, code]);

  // Auto-start game if coming from matchmaking
  useEffect(() => {
    const shouldAutoStart = searchParams.get('autostart') === 'true';

    if (shouldAutoStart && gameState) {
      console.log('Matchmaking auto-start check:', {
        attempted: autoStartAttemptedRef.current,
        lobbyCode: gameState.lobbyCode,
        code,
        playersLength: gameState.players.length,
        isGameStarted: gameState.isGameStarted,
        host: gameState.host,
        userId: user?.user_id,
      });
    }

    // Check each condition individually
    const cond1 = shouldAutoStart;
    const cond2 = !autoStartAttemptedRef.current;
    const cond3 = !!gameState;
    const cond4 = gameState?.lobbyCode === code;
    const cond5 = (gameState?.players.length ?? 0) >= 2;
    const cond6 = !gameState?.isGameStarted;

    console.log('Auto-start conditions:', {
      shouldAutoStart: cond1,
      notAttempted: cond2,
      hasGameState: cond3,
      lobbyCodeMatch: cond4,
      enoughPlayers: cond5,
      notStarted: cond6,
      allConditionsMet: cond1 && cond2 && cond3 && cond4 && cond5 && cond6,
    });

    if (cond1 && cond2 && cond3 && cond4 && cond5 && cond6) {
      console.log('🟢 ALL CONDITIONS MET! Checking host...');
      // Only host should start the game
      const isHost = user?.user_id === gameState.host;
      console.log('Host check:', {
        userId: user?.user_id,
        gameStateHost: gameState.host,
        isHost,
        typeofUserId: typeof user?.user_id,
        typeofHost: typeof gameState.host,
      });

      if (isHost) {
        console.log('🚀 AUTO-STARTING GAME NOW! (with 5 second delay)');
        autoStartAttemptedRef.current = true;
        // Longer delay to ensure BOTH players are fully connected to WebSocket
        setTimeout(() => {
          console.log('🎮 Calling startGame()...');
          startGame();
        }, 5000);
      } else {
        console.log('❌ Not host, waiting for host to start');
      }
    }
  }, [searchParams, gameState, code, user?.user_id, startGame]);

  const handleCopyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStartGame = () => {
    startGame();
  };

  const handleLeave = async () => {
    await leaveLobby();
    navigate('/');
  };

  if (joinError) {
    return (
      <div className="lobby-page full-screen flex-center">
        <FogOverlay />
        <AshParticles />
        <MistbornCard>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <h2 style={{ color: '#e6be8c', marginBottom: '1rem' }}>Failed to Join Lobby</h2>
            <p style={{ color: 'rgba(212, 165, 116, 0.95)', marginBottom: '1.5rem' }}>{joinError}</p>
            <MistbornButton onClick={() => navigate('/')}>Back to Home</MistbornButton>
          </div>
        </MistbornCard>
      </div>
    );
  }

  if (!gameState || !user) {
    return (
      <div className="lobby-page full-screen flex-center">
        <FogOverlay />
        <AshParticles />
        <div className="mistborn-spinner"></div>
      </div>
    );
  }

  const isHost = gameState.host === user.user_id;

  // Show loading screen for BOTH players if coming from matchmaking
  const isFromMatchmaking = searchParams.get('autostart') === 'true';
  if (isFromMatchmaking && !gameState.isGameStarted) {
    return (
      <div className="lobby-page full-screen flex-center">
        <FogOverlay />
        <AshParticles />
        <MistbornCard className="searching-card glow-effect">
          <div className="searching-content" style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="mistborn-spinner"></div>
            <h2 style={{ color: '#999', marginTop: '1.5rem', fontSize: '1.5rem' }}>
              Starting game...
            </h2>
            <p style={{ color: '#777', marginTop: '0.5rem' }}>
              Please wait
            </p>
          </div>
        </MistbornCard>
      </div>
    );
  }

  return (
    <div className="lobby-page">
      <FogOverlay />
      <AshParticles />

      <div className="lobby-content">
        <div className="lobby-header fade-in">
          <h1 className="lobby-title">Waiting Room</h1>
          <p className="lobby-subtitle">Prepare for the journey through mists...</p>
        </div>

        <div className="lobby-main">
          <MistbornCard className="invite-card slide-up glow-effect">
            <h2 className="invite-title">Invite Code</h2>
            <div className="invite-code-container">
              <div className="invite-code">{code}</div>
              <MistbornButton variant="primary" onClick={handleCopyCode}>
                {copied ? 'Copied!' : 'Copy'}
              </MistbornButton>
            </div>
            <p className="invite-hint">Share this code with your friends</p>
          </MistbornCard>

          <MistbornCard className="players-card slide-up">
            <div className="players-header">
              <h2 className="players-title">Players</h2>
              <div className="players-count">
                {gameState.players.length} / {gameState.maxPlayers}
              </div>
            </div>

            <div className="players-list">
              {gameState.players.map((player, index) => (
                <div
                  key={player.user_id}
                  className="player-item fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <Avatar src={player.avatar} size="small" />
                  <div className="player-info">
                    <div className="player-name">{player.name}</div>
                    {player.rank && <RankBadge rank={player.rank} size="small" />}
                  </div>
                  {player.user_id === gameState.host && <div className="host-badge">Host</div>}
                  {player.user_id === user.user_id && <div className="you-badge">You</div>}
                </div>
              ))}
            </div>

            {!isConnected && (
              <div className="connection-warning">
                <span>Connecting to server...</span>
                <div className="typing-indicator">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            )}
          </MistbornCard>

          <MistbornCard className="game-info-card slide-up">
            <h2 className="game-info-title">Game Settings</h2>
            <div className="game-info-grid">
              <div className="game-info-item">
                <div className="game-info-label">Rounds</div>
                <div className="game-info-value">{gameState.totalRounds}</div>
              </div>
              <div className="game-info-item">
                <div className="game-info-label">Max Players</div>
                <div className="game-info-value">{gameState.maxPlayers}</div>
              </div>
            </div>
          </MistbornCard>
        </div>

        <div className="lobby-actions">
          {isHost ? (
            <MistbornButton
              variant="danger"
              onClick={handleStartGame}
              disabled={!isConnected || gameState.players.length < 2}
              className="metallic-pulse"
            >
              Start Game
            </MistbornButton>
          ) : (
            <div className="waiting-message">
              <span>Waiting for host to start the game...</span>
              <div className="typing-indicator">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
          )}

          <MistbornButton variant="secondary" onClick={handleLeave}>
            Leave Lobby
          </MistbornButton>
        </div>
      </div>
    </div>
  );
};
