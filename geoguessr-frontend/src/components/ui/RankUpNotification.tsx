import React from 'react';
import { RankBadge } from './RankBadge';
import './RankUpNotification.css';

interface RankUpNotificationProps {
  playerName: string;
  oldRank: string;
  newRank: string;
  onComplete: () => void;
}

export const RankUpNotification: React.FC<RankUpNotificationProps> = ({
  playerName,
  oldRank,
  newRank,
  onComplete,
}) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 6000); // Show for 6 seconds for dark atmosphere

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="rank-up-notification">
      <div className="rank-up-content">
        <div className="rank-up-header">
          <div className="rank-up-icon">☠️</div>
          <h2 className="rank-up-title">ASCENSION</h2>
        </div>

        <div className="rank-up-player">{playerName}</div>

        <div className="rank-up-progression">
          <RankBadge rank={oldRank} size="large" />
          <div className="rank-up-arrow">→</div>
          <RankBadge rank={newRank} size="large" />
        </div>

        <div className="rank-up-sparkles">
          <span className="sparkle">🩸</span>
          <span className="sparkle">🩸</span>
          <span className="sparkle">🩸</span>
        </div>
      </div>
    </div>
  );
};
