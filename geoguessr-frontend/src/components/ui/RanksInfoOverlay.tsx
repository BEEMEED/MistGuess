import React from 'react';
import { MistbornCard } from './MistbornCard';
import './RanksInfoOverlay.css';

interface RanksInfoOverlayProps {
  onClose: () => void;
  currentXP?: number;
  currentRank?: string;
}

interface RankInfo {
  name: string;
  minXP: number;
  maxXP: number;
  tier: 'bronze' | 'silver' | 'gold' | 'master';
}

const RANKS: RankInfo[] = [
  { name: 'Ashborn', minXP: 0, maxXP: 100, tier: 'bronze' },
  { name: 'Fog Runner', minXP: 100, maxXP: 300, tier: 'bronze' },
  { name: 'Tin Sight', minXP: 300, maxXP: 600, tier: 'bronze' },
  { name: 'Brass Deceiver', minXP: 600, maxXP: 1000, tier: 'silver' },
  { name: 'Steel Pusher', minXP: 1000, maxXP: 1600, tier: 'silver' },
  { name: 'Iron Puller', minXP: 1600, maxXP: 2500, tier: 'gold' },
  { name: 'Atium Shadow', minXP: 2500, maxXP: 4000, tier: 'gold' },
  { name: 'Mistborn', minXP: 4000, maxXP: 6500, tier: 'master' },
  { name: 'Lord Mistborn', minXP: 6500, maxXP: Infinity, tier: 'master' },
];

export const RanksInfoOverlay: React.FC<RanksInfoOverlayProps> = ({
  onClose,
  currentXP = 0,
  currentRank = 'Ashborn',
}) => {
  const getCurrentRankIndex = () => {
    return RANKS.findIndex((rank) => rank.name === currentRank);
  };

  const getProgressToNextRank = () => {
    const currentIndex = getCurrentRankIndex();
    if (currentIndex === -1 || currentIndex === RANKS.length - 1) return 100;

    const currentRankInfo = RANKS[currentIndex];
    const xpInCurrentRank = currentXP - currentRankInfo.minXP;
    const xpNeededForRank = currentRankInfo.maxXP - currentRankInfo.minXP;
    return Math.min(100, (xpInCurrentRank / xpNeededForRank) * 100);
  };

  const getNextRankInfo = () => {
    const currentIndex = getCurrentRankIndex();
    if (currentIndex === -1 || currentIndex === RANKS.length - 1) return null;
    return RANKS[currentIndex + 1];
  };

  const nextRank = getNextRankInfo();
  const progress = getProgressToNextRank();

  return (
    <div className="ranks-overlay" onClick={onClose}>
      <div className="ranks-overlay__content" onClick={(e) => e.stopPropagation()}>
        <MistbornCard className="ranks-card">
          <div className="ranks-header">
            <h2 className="ranks-title">Mistborn Ranks</h2>
            <button className="ranks-close" onClick={onClose}>
              ✕
            </button>
          </div>

          {currentRank && (
            <div className="ranks-current">
              <div className="ranks-current-info">
                <span className="ranks-current-label">Your Rank</span>
                <span className={`ranks-current-name ranks-current-name--${RANKS[getCurrentRankIndex()]?.tier}`}>
                  {currentRank}
                </span>
                <span className="ranks-current-xp">{currentXP} XP</span>
              </div>

              {nextRank && (
                <div className="ranks-progress-section">
                  <div className="ranks-progress-header">
                    <span>Progress to {nextRank.name}</span>
                    <span>{nextRank.minXP - currentXP} XP needed</span>
                  </div>
                  <div className="ranks-progress-bar">
                    <div
                      className="ranks-progress-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="ranks-list">
            <h3 className="ranks-list-title">All Ranks</h3>
            {RANKS.map((rank, index) => {
              const isCurrentRank = rank.name === currentRank;
              const isUnlocked = currentXP >= rank.minXP;

              return (
                <div
                  key={rank.name}
                  className={`rank-item rank-item--${rank.tier} ${
                    isCurrentRank ? 'rank-item--current' : ''
                  } ${isUnlocked ? 'rank-item--unlocked' : 'rank-item--locked'}`}
                >
                  <div className="rank-item-icon">
                    {isUnlocked ? '⚔' : '🔒'}
                  </div>
                  <div className="rank-item-info">
                    <div className="rank-item-name">{rank.name}</div>
                    <div className="rank-item-xp">
                      {rank.maxXP === Infinity
                        ? `${rank.minXP}+ XP`
                        : `${rank.minXP} - ${rank.maxXP} XP`}
                    </div>
                  </div>
                  {isCurrentRank && <div className="rank-item-badge">Current</div>}
                </div>
              );
            })}
          </div>
        </MistbornCard>
      </div>
    </div>
  );
};
