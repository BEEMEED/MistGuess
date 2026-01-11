import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMatchmaking } from '../context/MatchmakingContext';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { MistbornButton } from '../components/ui/MistbornButton';
import { MistbornCard } from '../components/ui/MistbornCard';
import { RankBadge } from '../components/ui/RankBadge';
import { Avatar } from '../components/ui/Avatar';
import { FogOverlay } from '../components/effects/FogOverlay';
import { getFlagEmoji, getCountryName } from '../services/flags';
import '../styles/MatchmakingPage.css';

export const MatchmakingPage: React.FC = () => {
  const { state, joinQueue, leaveQueue, resetRedirectFlag } = useMatchmaking();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);

  // Load profile
  useEffect(() => {
    const loadProfile = async () => {
      if (user?.token) {
        try {
          const data = await apiService.getProfile();
          setProfile(data);
        } catch (err) {
          console.error('Failed to load profile:', err);
        }
      }
    };
    loadProfile();
  }, [user]);

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

  const getFavoriteCountry = () => {
    if (!profile?.country_stats) return null;
    const stats = profile.country_stats;
    let maxClose = 0;
    let favCountry = null;
    for (const [code, data] of Object.entries(stats)) {
      if ((data as any).close > maxClose) {
        maxClose = (data as any).close;
        favCountry = code;
      }
    }
    return favCountry;
  };

  const getDislikedCountry = () => {
    if (!profile?.country_stats) return null;
    const stats = profile.country_stats;
    let maxFar = 0;
    let dislikedCountry = null;
    for (const [code, data] of Object.entries(stats)) {
      if ((data as any).far > maxFar) {
        maxFar = (data as any).far;
        dislikedCountry = code;
      }
    }
    return dislikedCountry;
  };

  const handleCancel = () => {
    leaveQueue();
    navigate('/');
  };

  const favCountry = getFavoriteCountry();
  const dislikedCountry = getDislikedCountry();

  return (
    <div className="matchmaking-page">
      <FogOverlay />

      {/* Player Profile Card */}
      {profile && (
        <div className="player-profile-card">
          <MistbornCard>
            <div className="profile-card-content">
              <Avatar src={profile.avatar} size="large" />
              <div className="profile-card-name">{profile.name}</div>
              <RankBadge rank={profile.rank} size="medium" />
              <div className="profile-card-xp">{profile.xp} XP</div>

              {(favCountry || dislikedCountry) && (
                <div className="profile-card-countries">
                  {favCountry && (
                    <div className="country-item favorite" title={`Favorite: ${getCountryName(favCountry)}`}>
                      <span className="country-label">Favorite:</span>
                      <span className="country-flag">{getFlagEmoji(favCountry)}</span>
                    </div>
                  )}
                  {dislikedCountry && (
                    <div className="country-item disliked" title={`Disliked: ${getCountryName(dislikedCountry)}`}>
                      <span className="country-label">Disliked:</span>
                      <span className="country-flag">{getFlagEmoji(dislikedCountry)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </MistbornCard>
        </div>
      )}

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
