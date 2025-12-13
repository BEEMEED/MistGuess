import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLobby } from '../../context/LobbyContext';
import { TelegramLinkOverlay } from '../profile/TelegramLinkOverlay';
import { apiService } from '../../services/api';
import './SettingsOverlay.css';

interface SettingsOverlayProps {
  onClose: () => void;
  // Optional timer props for solo mode
  timerEnabled?: boolean;
  timerDuration?: number;
  onTimerEnabledChange?: (enabled: boolean) => void;
  onTimerDurationChange?: (duration: number) => void;
}

export const SettingsOverlay: React.FC<SettingsOverlayProps> = ({
  onClose,
  timerEnabled,
  timerDuration,
  onTimerEnabledChange,
  onTimerDurationChange
}) => {
  const { user, logout } = useAuth();
  const { createLobby } = useLobby();
  const navigate = useNavigate();
  const [showTelegramLink, setShowTelegramLink] = useState(false);
  const [telegramCode, setTelegramCode] = useState('');
  const [hasTelegram, setHasTelegram] = useState(false);
  const [creatingLobby, setCreatingLobby] = useState(false);
  const [showMultiplayerOptions, setShowMultiplayerOptions] = useState(false);
  const [showJoinLobby, setShowJoinLobby] = useState(false);
  const [showCreateLobby, setShowCreateLobby] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  React.useEffect(() => {
    const checkTelegram = async () => {
      if (user) {
        try {
          const profile = await apiService.getProfile();
          setHasTelegram(profile.telegram && profile.telegram !== 'null');
        } catch (err) {
          console.error('Failed to check telegram status:', err);
        }
      }
    };
    checkTelegram();
  }, [user]);

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleTelegramLink = async () => {
    try {
      const { code } = await apiService.getTelegramLinkCode();
      setTelegramCode(code);
      setShowTelegramLink(true);
    } catch (err) {
      console.error('Failed to get telegram link code:', err);
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const handleMultiplayerClick = () => {
    setShowMultiplayerOptions(true);
  };

  const handleCreateLobby = async () => {
    try {
      setCreatingLobby(true);
      const code = await createLobby();
      onClose();
      navigate(`/lobby/${code}`);
    } catch (err) {
      console.error('Failed to create lobby:', err);
    } finally {
      setCreatingLobby(false);
    }
  };

  const handleJoinLobby = () => {
    if (joinCode.trim()) {
      onClose();
      navigate(`/lobby/${joinCode.trim()}`);
    }
  };

  if (showTelegramLink) {
    return (
      <TelegramLinkOverlay
        linkCode={telegramCode}
        onClose={() => {
          setShowTelegramLink(false);
          onClose();
        }}
      />
    );
  }

  if (showMultiplayerOptions) {
    return (
      <div className="settings-overlay">
        <div className="settings-overlay__backdrop" onClick={() => setShowMultiplayerOptions(false)} />
        <div className="settings-overlay__content">
          <div className="settings-overlay__header">
            <h2 className="settings-overlay__title">Multiplayer</h2>
            <button className="settings-overlay__close" onClick={() => setShowMultiplayerOptions(false)}>
              ✕
            </button>
          </div>

          <div className="settings-overlay__menu">
            {!showJoinLobby && !showCreateLobby ? (
              <>
                <button
                  className="settings-overlay__menu-item"
                  onClick={() => setShowCreateLobby(true)}
                >
                  <span className="settings-overlay__menu-icon">➕</span>
                  <span>Create Lobby</span>
                </button>

                <button
                  className="settings-overlay__menu-item"
                  onClick={() => setShowJoinLobby(true)}
                >
                  <span className="settings-overlay__menu-icon">🔗</span>
                  <span>Join Lobby</span>
                </button>
              </>
            ) : showCreateLobby ? (
              <>
                <div className="settings-overlay__form" style={{ padding: '1rem', textAlign: 'center' }}>
                  <p style={{ color: 'rgba(212, 165, 116, 0.95)', marginBottom: '1rem', textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)' }}>
                    Create a 1v1 HP Duel
                  </p>
                  <p style={{ color: 'rgba(170, 170, 170, 0.7)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    • 2 Players
                  </p>
                  <p style={{ color: 'rgba(170, 170, 170, 0.7)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    • 6000 HP each
                  </p>
                  <p style={{ color: 'rgba(170, 170, 170, 0.7)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    • 4 minute timer
                  </p>
                  <p style={{ color: 'rgba(170, 170, 170, 0.7)', fontSize: '0.9rem' }}>
                    • Battle until HP reaches 0
                  </p>
                </div>

                <button
                  className="settings-overlay__menu-item"
                  onClick={handleCreateLobby}
                  disabled={creatingLobby}
                >
                  <span className="settings-overlay__menu-icon">✓</span>
                  <span>{creatingLobby ? 'Creating...' : 'Create Lobby'}</span>
                </button>

                <button
                  className="settings-overlay__menu-item settings-overlay__menu-item--logout"
                  onClick={() => setShowCreateLobby(false)}
                >
                  <span className="settings-overlay__menu-icon">←</span>
                  <span>Back</span>
                </button>
              </>
            ) : (
              <>
                <div className="settings-overlay__form">
                  <input
                    type="text"
                    className="settings-overlay__input"
                    placeholder="Enter lobby code..."
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    maxLength={8}
                    autoFocus
                  />
                </div>

                <button
                  className="settings-overlay__menu-item"
                  onClick={handleJoinLobby}
                  disabled={!joinCode.trim()}
                >
                  <span className="settings-overlay__menu-icon">✓</span>
                  <span>Join</span>
                </button>

                <button
                  className="settings-overlay__menu-item settings-overlay__menu-item--logout"
                  onClick={() => {
                    setShowJoinLobby(false);
                    setJoinCode('');
                  }}
                >
                  <span className="settings-overlay__menu-icon">←</span>
                  <span>Back</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-overlay">
      <div className="settings-overlay__backdrop" onClick={onClose} />
      <div className="settings-overlay__content">
        <div className="settings-overlay__header">
          <h2 className="settings-overlay__title">Menu</h2>
          <button className="settings-overlay__close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="settings-overlay__menu">
          {/* Solo Mode Timer Settings */}
          {onTimerEnabledChange && onTimerDurationChange && (
            <div className="settings-overlay__timer-section">
              <div className="settings-overlay__timer-header">
                <span className="settings-overlay__menu-icon">⏱</span>
                <span>Solo Timer</span>
              </div>

              <div className="settings-overlay__form" style={{ padding: '0.75rem 1rem' }}>
                <label style={{
                  color: 'rgba(212, 165, 116, 0.95)',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)'
                }}>
                  <input
                    type="checkbox"
                    checked={timerEnabled}
                    onChange={(e) => onTimerEnabledChange(e.target.checked)}
                    style={{ width: 'auto', cursor: 'pointer' }}
                  />
                  Enable Timer
                </label>

                {timerEnabled && (
                  <>
                    <label style={{
                      color: 'rgba(212, 165, 116, 0.95)',
                      marginBottom: '0.5rem',
                      marginTop: '0.75rem',
                      display: 'block',
                      textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)'
                    }}>
                      Duration: {Math.floor((timerDuration || 120) / 60)}:{String((timerDuration || 120) % 60).padStart(2, '0')}
                    </label>
                    <input
                      type="range"
                      min="30"
                      max="600"
                      step="30"
                      value={timerDuration || 120}
                      onChange={(e) => onTimerDurationChange(parseInt(e.target.value))}
                      style={{ width: '100%' }}
                    />
                    <div style={{
                      color: 'rgba(170, 170, 170, 0.7)',
                      fontSize: '0.85rem',
                      marginTop: '0.25rem',
                      textAlign: 'center'
                    }}>
                      (30 seconds - 10 minutes)
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {user && (
            <>
              <button
                className="settings-overlay__menu-item"
                onClick={handleMultiplayerClick}
              >
                <span className="settings-overlay__menu-icon">⚔️</span>
                <span>Multiplayer</span>
              </button>

              <button
                className="settings-overlay__menu-item"
                onClick={() => handleNavigate('/profile')}
              >
                <span className="settings-overlay__menu-icon">👤</span>
                <span>Profile</span>
              </button>

              <button
                className="settings-overlay__menu-item"
                onClick={() => handleNavigate('/leaderboard')}
              >
                <span className="settings-overlay__menu-icon">🏆</span>
                <span>Leaderboard</span>
              </button>

              {!hasTelegram && (
                <button
                  className="settings-overlay__menu-item"
                  onClick={handleTelegramLink}
                >
                  <span className="settings-overlay__menu-icon">📱</span>
                  <span>Link Telegram</span>
                </button>
              )}

              {user.role === 'admin' && (
                <button
                  className="settings-overlay__menu-item settings-overlay__menu-item--admin"
                  onClick={() => handleNavigate('/admin')}
                >
                  <span className="settings-overlay__menu-icon">⚙️</span>
                  <span>Admin Panel</span>
                </button>
              )}

              <button
                className="settings-overlay__menu-item settings-overlay__menu-item--logout"
                onClick={handleLogout}
              >
                <span className="settings-overlay__menu-icon">🚪</span>
                <span>Logout</span>
              </button>
            </>
          )}

          {!user && (
            <button
              className="settings-overlay__menu-item settings-overlay__menu-item--login"
              onClick={async () => {
                onClose();
                try {
                  const authUrl = await apiService.getGoogleAuthUrl();
                  window.location.href = authUrl;
                } catch (error) {
                  console.error('Failed to get Google auth URL:', error);
                }
              }}
            >
              <span className="settings-overlay__menu-icon">🔑</span>
              <span>Login with Google</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
