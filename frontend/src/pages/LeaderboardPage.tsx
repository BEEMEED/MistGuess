import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { MistbornButton } from '../components/ui/MistbornButton';
import { MistbornCard } from '../components/ui/MistbornCard';
import { RankBadge } from '../components/ui/RankBadge';
import { Avatar } from '../components/ui/Avatar';
import { FogOverlay } from '../components/effects/FogOverlay';
import { AshParticles } from '../components/effects/AshParticles';
import '../styles/LeaderboardPage.css';

interface LeaderboardEntry {
  name: string;
  xp: number;
  rank: string;
  avatar: string;
}

export const LeaderboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('http://localhost:8000/profile/leaderboard');
      if (!response.ok) throw new Error('Failed to load leaderboard');
      const data = await response.json();
      setLeaderboard(data);
    } catch (err: any) {
      console.error('Failed to load leaderboard:', err);
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="leaderboard-page">
        <FogOverlay />
        <AshParticles />
        <div className="leaderboard-loading">Loading leaderboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaderboard-page">
        <FogOverlay />
        <AshParticles />
        <div className="leaderboard-error">
          <p>{error}</p>
          <MistbornButton onClick={() => navigate('/')}>Back to Home</MistbornButton>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-page">
      <FogOverlay />
      <AshParticles />

      <div className="leaderboard-container">
        <MistbornCard>
          <div className="leaderboard-header">
            <h1 className="leaderboard-title">Leaderboard</h1>
            <MistbornButton onClick={() => navigate('/')}>
              Back to Home
            </MistbornButton>
          </div>

          <div className="leaderboard-list">
            {leaderboard.map((entry, index) => (
              <div
                key={index}
                className={`leaderboard-entry ${index < 3 ? `top-${index + 1}` : ''}`}
              >
                <div className="entry-position">
                  {index === 0 && '🥇'}
                  {index === 1 && '🥈'}
                  {index === 2 && '🥉'}
                  {index > 2 && `#${index + 1}`}
                </div>

                <Avatar src={entry.avatar} size="medium" />

                <div className="entry-info">
                  <div className="entry-name">{entry.name}</div>
                  <div className="entry-xp">{entry.xp} XP</div>
                </div>

                <RankBadge rank={entry.rank} size="small" />
              </div>
            ))}
          </div>
        </MistbornCard>
      </div>
    </div>
  );
};
