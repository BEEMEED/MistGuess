import React from 'react';
import './RankBadge.css';

interface RankBadgeProps {
  rank: string;
  size?: 'small' | 'medium' | 'large';
}

export const RankBadge: React.FC<RankBadgeProps> = ({ rank, size = 'medium' }) => {
  // Determine rank tier for styling
  const getRankTier = (rankName: string): string => {
    const rankIndex = [
      'Ashborn',
      'Fog Runner',
      'Tin Sight',
      'Brass Deceiver',
      'Steel Pusher',
      'Iron Puller',
      'Atium Shadow',
      'Mistborn',
      'Lord Mistborn',
    ].indexOf(rankName);

    if (rankIndex <= 2) return 'bronze';
    if (rankIndex <= 4) return 'silver';
    if (rankIndex <= 6) return 'gold';
    return 'master';
  };

  const tier = getRankTier(rank);

  return (
    <div className={`rank-badge rank-badge--${size} rank-badge--${tier}`}>
      <span className="rank-badge__icon">⚔</span>
      <span className="rank-badge__text">{rank}</span>
    </div>
  );
};
