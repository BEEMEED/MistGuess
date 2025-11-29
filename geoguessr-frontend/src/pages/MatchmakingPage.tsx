import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMatchmaking } from '../context/MatchmakingContext';
import { MistbornButton } from '../components/ui/MistbornButton';
import { MistbornCard } from '../components/ui/MistbornCard';
import { RankBadge } from '../components/ui/RankBadge';
import { FogOverlay } from '../components/effects/FogOverlay';
import '../styles/MatchmakingPage.css';

export const MatchmakingPage: React.FC = () => {
  const { state, joinQueue, leaveQueue, isConnected, resetRedirectFlag } = useMatchmaking();
  const navigate = useNavigate();

  // Reset redirect flag when component mounts
  useEffect(() => {
    resetRedirectFlag();
  }, [resetRedirectFlag]);

  useEffect(() => {
    // Автоматически присоединиться к очереди при загрузке страницы
    if (!state.isInQueue && !state.matchFound) {
      joinQueue();
    }
  }, [state.isInQueue, state.matchFound, joinQueue]);

  const handleCancel = () => {
    leaveQueue();
    navigate('/');
  };

  return (
    <div className="matchmaking-page">
      <FogOverlay />

      <div className="matchmaking-container">
        {/* Connecting State */}
        {!state.isInQueue && !state.matchFound && !state.error && (
          <MistbornCard className="searching-card glow-effect">
            <div className="searching-content">
              <div className="searching-spinner">
                <div className="spinner-ring"></div>
                <div className="spinner-ring delay-1"></div>
                <div className="spinner-ring delay-2"></div>
              </div>

              <h1 className="searching-title">Connecting to matchmaking...</h1>
              <p className="searching-subtitle">Please wait</p>
            </div>
          </MistbornCard>
        )}

        {/* Searching State */}
        {state.isInQueue && !state.matchFound && (
          <MistbornCard className="searching-card glow-effect">
            <div className="searching-content">
              <div className="searching-spinner">
                <div className="spinner-ring"></div>
                <div className="spinner-ring delay-1"></div>
                <div className="spinner-ring delay-2"></div>
              </div>

              <h1 className="searching-title">Searching for Opponent...</h1>

              {state.queuePosition && (
                <p className="queue-info">
                  Queue Position: <span className="highlight">#{state.queuePosition}</span>
                </p>
              )}

              <p className="searching-subtitle">Finding player with similar XP (±200)</p>

              <MistbornButton variant="secondary" onClick={handleCancel} className="cancel-btn">
                Cancel Search
              </MistbornButton>
            </div>
          </MistbornCard>
        )}

        {/* Match Found State */}
        {state.matchFound && state.opponent && (
          <MistbornCard className="match-found-card pulse-glow">
            <div className="match-found-content">
              <h1 className="match-found-title">Match Found!</h1>

              <div className="opponent-info">
                <div className="opponent-avatar-container">
                  <img
                    src={
                      state.opponent.avatar
                        ? `http://localhost:8000/${state.opponent.avatar}`
                        : '/default-avatar.png'
                    }
                    alt={state.opponent.name}
                    className="opponent-avatar"
                    onError={(e) => {
                      e.currentTarget.src = '/default-avatar.png';
                    }}
                  />
                </div>

                <h2 className="opponent-name">{state.opponent.name}</h2>

                <RankBadge rank={state.opponent.rank} size="medium" />

                <p className="opponent-xp">{state.opponent.xp} XP</p>
              </div>

              <p className="searching-subtitle">Connecting to lobby...</p>
            </div>
          </MistbornCard>
        )}

        {/* Error State */}
        {state.error && (
          <MistbornCard className="error-card">
            <div className="error-content">
              <h2 className="error-title">⚠️ Error</h2>
              <p className="error-message">{state.error}</p>
              <MistbornButton onClick={() => navigate('/')} variant="primary">
                Back to Menu
              </MistbornButton>
            </div>
          </MistbornCard>
        )}
      </div>
    </div>
  );
};
