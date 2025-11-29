import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLobby } from '../context/LobbyContext';
import { MistbornButton } from '../components/ui/MistbornButton';
import { MistbornCard } from '../components/ui/MistbornCard';
import { FogOverlay } from '../components/effects/FogOverlay';
import { AshParticles } from '../components/effects/AshParticles';
import { Avatar } from '../components/ui/Avatar';
import { RankBadge } from '../components/ui/RankBadge';
import { RankUpNotification } from '../components/ui/RankUpNotification';
import { RoundBreakdown } from '../components/game/RoundBreakdown';
import { wsService } from '../services/websocket';
import type { WSEvent } from '../types';
import './FinalResultsPage.css';

export const FinalResultsPage: React.FC = () => {
  const { user } = useAuth();
  const { gameState, leaveLobby } = useLobby();
  const navigate = useNavigate();
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set());
  const [rankUpQueue, setRankUpQueue] = useState<Array<{
    login: string;
    old_rank: string;
    new_rank: string;
  }>>([]);
  const [currentRankUp, setCurrentRankUp] = useState<{
    login: string;
    old_rank: string;
    new_rank: string;
  } | null>(null);

  // Load rank ups from gameState on mount - only for current user
  useEffect(() => {
    if (gameState?.rankUps && gameState.rankUps.length > 0 && user) {
      console.log('Loading rankUps from gameState:', gameState.rankUps);
      // Only show rank up for current user
      const myRankUp = gameState.rankUps.find(ru => ru.login === user.login);
      if (myRankUp) {
        setRankUpQueue([myRankUp]);
      }
    }
  }, []);

  // Process rank up queue one by one
  useEffect(() => {
    console.log('rankUpQueue:', rankUpQueue, 'currentRankUp:', currentRankUp);
    if (!currentRankUp && rankUpQueue.length > 0) {
      console.log('Setting currentRankUp to:', rankUpQueue[0]);
      setCurrentRankUp(rankUpQueue[0]);
      setRankUpQueue((prev) => prev.slice(1));
    }
  }, [currentRankUp, rankUpQueue]);

  const handleRankUpComplete = () => {
    setCurrentRankUp(null);
  };

  const handleBackHome = async () => {
    await leaveLobby();
    navigate('/');
  };

  const toggleRound = (roundNumber: number) => {
    setExpandedRounds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(roundNumber)) {
        newSet.delete(roundNumber);
      } else {
        newSet.add(roundNumber);
      }
      return newSet;
    });
  };

  // Helper function to get player info
  const getPlayerInfo = (login: string) => {
    const player = gameState?.players.find((p) => p.login === login);
    return {
      name: player?.name || login,
      avatar: player?.avatar || '',
      rank: player?.rank || 'Ashborn',
    };
  };

  if (!gameState || !gameState.finalResults || !user) {
    return (
      <div className="final-page full-screen flex-center">
        <FogOverlay />
        <AshParticles />
        <div className="mistborn-spinner"></div>
      </div>
    );
  }

  const sortedPlayers = Object.entries(gameState.finalResults.totalDistances)
    .sort(([, distA], [, distB]) => distA - distB)
    .map(([player, distance]) => ({ player, distance }));

  const isWinner = gameState.finalResults.winner === user.login;

  return (
    <div className="final-page">
      <FogOverlay />
      <AshParticles />

      <div className="final-content">
        <div className="final-header fade-in">
          <h1 className="final-title">Game Complete</h1>
          <p className="final-subtitle">
            {isWinner
              ? 'You are the Mistborn Champion!'
              : 'The mists have chosen their champion...'}
          </p>
        </div>

        <MistbornCard className="champion-card slide-up victory-glow">
          <div className="champion-crown">👑</div>
          <h2 className="champion-title">Champion</h2>
          <div className="champion-info">
            <Avatar
              src={getPlayerInfo(gameState.finalResults.winner).avatar}
              size="large"
            />
            <div className="champion-details">
              <div className="champion-name">
                {getPlayerInfo(gameState.finalResults.winner).name}
              </div>
              <RankBadge rank={getPlayerInfo(gameState.finalResults.winner).rank} size="large" />
              <div className="champion-distance">
                Total Distance:{' '}
                {(
                  gameState.finalResults.totalDistances[gameState.finalResults.winner] / 1000
                ).toFixed(2)}{' '}
                km
              </div>
            </div>
          </div>
        </MistbornCard>

        <MistbornCard className="final-scoreboard-card slide-up">
          <h2 className="final-scoreboard-title">Final Standings</h2>
          <div className="final-scoreboard-list">
            {sortedPlayers.map((result, index) => (
              <div
                key={result.player}
                className={`final-scoreboard-item fade-in ${
                  result.player === user.login ? 'current-user' : ''
                } ${index === 0 ? 'first-place' : ''} ${
                  index === 1 ? 'second-place' : ''
                } ${index === 2 ? 'third-place' : ''}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="final-rank">
                  {index === 0 && '🥇'}
                  {index === 1 && '🥈'}
                  {index === 2 && '🥉'}
                  {index > 2 && `#${index + 1}`}
                </div>
                <div className="final-player">
                  <Avatar
                    src={getPlayerInfo(result.player).avatar}
                    size="small"
                  />
                  <div className="final-player-info">
                    <div className="final-name">
                      {getPlayerInfo(result.player).name}
                    </div>
                    <RankBadge rank={getPlayerInfo(result.player).rank} size="small" />
                  </div>
                </div>
                <div className="final-distance">
                  {(result.distance / 1000).toFixed(2)} km
                </div>
              </div>
            ))}
          </div>
        </MistbornCard>

        <MistbornCard className="round-breakdown-card slide-up">
          <h2 className="breakdown-title">Round by Round</h2>
          <div className="breakdown-list">
            {gameState.roundResults.map((round) => (
              <RoundBreakdown
                key={round.round}
                round={round}
                players={gameState.players}
                isExpanded={expandedRounds.has(round.round)}
                onToggle={() => toggleRound(round.round)}
              />
            ))}
          </div>
        </MistbornCard>

        <div className="final-actions">
          <MistbornButton variant="danger" onClick={handleBackHome}>
            Back to Home
          </MistbornButton>
        </div>
      </div>

      {currentRankUp && (
        <RankUpNotification
          playerName={getPlayerInfo(currentRankUp.login).name}
          oldRank={currentRankUp.old_rank}
          newRank={currentRankUp.new_rank}
          onComplete={handleRankUpComplete}
        />
      )}
    </div>
  );
};
