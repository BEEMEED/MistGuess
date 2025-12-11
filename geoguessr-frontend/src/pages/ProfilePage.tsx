import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { Avatar } from '../components/ui/Avatar';
import { RankBadge } from '../components/ui/RankBadge';
import { RanksInfoOverlay } from '../components/ui/RanksInfoOverlay';
import { MistbornButton } from '../components/ui/MistbornButton';
import { MistbornCard } from '../components/ui/MistbornCard';
import { EditNameOverlay } from '../components/profile/EditNameOverlay';
import { EditAvatarOverlay } from '../components/profile/EditAvatarOverlay';
import { TelegramLinkOverlay } from '../components/profile/TelegramLinkOverlay';
import { FogOverlay } from '../components/effects/FogOverlay';
import { AshParticles } from '../components/effects/AshParticles';
import '../styles/ProfilePage.css';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<{ name: string; avatar: string; xp: number; rank: string; telegram?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showEditName, setShowEditName] = useState(false);
  const [showEditAvatar, setShowEditAvatar] = useState(false);
  const [showRanksInfo, setShowRanksInfo] = useState(false);
  const [showTelegramLink, setShowTelegramLink] = useState(false);
  const [telegramCode, setTelegramCode] = useState<string>('');

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    loadProfile();
  }, [user, navigate]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiService.getProfile();
      setProfile(data);
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveName = async (newName: string) => {
    await apiService.updateName(newName);
    await loadProfile(); // Reload profile
  };

  const handleSaveAvatar = async (file: File) => {
    await apiService.uploadAvatar(file);
    await loadProfile(); // Reload profile
  };

  const handleLinkTelegram = async () => {
    try {
      const data = await apiService.getTelegramLinkCode();
      setTelegramCode(data.code);
      setShowTelegramLink(true);
    } catch (err: any) {
      console.error('Failed to get Telegram link code:', err);
      setError(err.message || 'Failed to generate link code');
    }
  };

  const RANKS = [
    { name: 'Ashborn', minXP: 0, maxXP: 100 },
    { name: 'Fog Runner', minXP: 100, maxXP: 300 },
    { name: 'Tin Sight', minXP: 300, maxXP: 600 },
    { name: 'Brass Deceiver', minXP: 600, maxXP: 1000 },
    { name: 'Steel Pusher', minXP: 1000, maxXP: 1600 },
    { name: 'Iron Puller', minXP: 1600, maxXP: 2500 },
    { name: 'Atium Shadow', minXP: 2500, maxXP: 4000 },
    { name: 'Mistborn', minXP: 4000, maxXP: 6500 },
    { name: 'Lord Mistborn', minXP: 6500, maxXP: Infinity },
  ];

  const getRankProgress = () => {
    if (!profile) return { progress: 0, xpNeeded: 0, nextRank: null };

    const currentRankIndex = RANKS.findIndex((r) => r.name === profile.rank);
    if (currentRankIndex === -1 || currentRankIndex === RANKS.length - 1) {
      return { progress: 100, xpNeeded: 0, nextRank: null };
    }

    const currentRank = RANKS[currentRankIndex];
    const nextRank = RANKS[currentRankIndex + 1];
    const xpInCurrentRank = profile.xp - currentRank.minXP;
    const xpNeededForRank = currentRank.maxXP - currentRank.minXP;
    const progress = Math.min(100, (xpInCurrentRank / xpNeededForRank) * 100);
    const xpNeeded = nextRank.minXP - profile.xp;

    return { progress, xpNeeded, nextRank: nextRank.name };
  };

  const { progress, xpNeeded, nextRank } = getRankProgress();

  if (isLoading) {
    return (
      <div className="profile-page">
        <FogOverlay />
        <AshParticles />
        <div className="profile-page__loading">Loading profile...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="profile-page">
        <FogOverlay />
        <AshParticles />
        <div className="profile-page__error">
          <p>{error || 'Failed to load profile'}</p>
          <MistbornButton onClick={() => navigate('/')}>
            Back to Home
          </MistbornButton>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <FogOverlay />
      <AshParticles />

      <div className="profile-page__container">
        <MistbornCard>
          <div className="profile-page__header">
            <h1 className="profile-page__title">My Profile</h1>
            <MistbornButton onClick={() => navigate('/')}>
              Back to Home
            </MistbornButton>
          </div>

          <div className="profile-page__content">
            {/* Avatar section */}
            <div className="profile-section">
              <div className="profile-section__avatar">
                <Avatar src={profile.avatar} size="large" />
                <MistbornButton onClick={() => setShowEditAvatar(true)}>
                  Change Avatar
                </MistbornButton>
              </div>
            </div>

            {/* Name section */}
            <div className="profile-section">
              <h2 className="profile-section__label">Display Name</h2>
              <div className="profile-section__value">{profile.name}</div>
              <MistbornButton onClick={() => setShowEditName(true)}>
                Edit Name
              </MistbornButton>
            </div>

            {/* User ID section (read-only) */}
            <div className="profile-section">
              <h2 className="profile-section__label">User ID</h2>
              <div className="profile-section__value">{user?.user_id}</div>
            </div>

            {/* Telegram section */}
            <div className="profile-section">
              <h2 className="profile-section__label">Telegram Notifications</h2>
              {profile.telegram && profile.telegram !== 'null' ? (
                <div className="profile-section__value telegram-linked">
                  ✓ Telegram Linked
                </div>
              ) : (
                <>
                  <div className="profile-section__value telegram-not-linked">
                    Not linked
                  </div>
                  <MistbornButton onClick={handleLinkTelegram}>
                    Link Telegram Account
                  </MistbornButton>
                </>
              )}
            </div>

            {/* Rank and XP section */}
            <div className="profile-section profile-section--rank">
              <div className="rank-section-header">
                <h2 className="profile-section__label">Rank & Experience</h2>
                <button
                  className="view-all-ranks-btn"
                  onClick={() => setShowRanksInfo(true)}
                >
                  View All Ranks
                </button>
              </div>

              <div className="rank-display">
                <RankBadge rank={profile.rank} size="large" />
                <div className="xp-display">{profile.xp} XP</div>
              </div>

              {nextRank && (
                <div className="rank-progress">
                  <div className="rank-progress-header">
                    <span>Progress to {nextRank}</span>
                    <span className="xp-needed">{xpNeeded} XP needed</span>
                  </div>
                  <div className="rank-progress-bar">
                    <div
                      className="rank-progress-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="rank-progress-percentage">{Math.round(progress)}%</div>
                </div>
              )}
            </div>
          </div>
        </MistbornCard>
      </div>

      {/* Overlays */}
      {showEditName && (
        <EditNameOverlay
          currentName={profile.name}
          onSave={handleSaveName}
          onClose={() => setShowEditName(false)}
        />
      )}

      {showEditAvatar && (
        <EditAvatarOverlay
          currentAvatar={profile.avatar}
          onSave={handleSaveAvatar}
          onClose={() => setShowEditAvatar(false)}
        />
      )}

      {showRanksInfo && (
        <RanksInfoOverlay
          onClose={() => setShowRanksInfo(false)}
          currentXP={profile.xp}
          currentRank={profile.rank}
        />
      )}

      {showTelegramLink && telegramCode && (
        <TelegramLinkOverlay
          linkCode={telegramCode}
          onClose={() => setShowTelegramLink(false)}
        />
      )}
    </div>
  );
};
