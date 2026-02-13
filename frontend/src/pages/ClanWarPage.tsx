import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiService as api } from '../services/api';
import type { ClanWar, Clan, PlayerInfo } from '../types/index';
import './ClanWarPage.css';

export const ClanWarPage: React.FC = () => {
  const { warId } = useParams<{ warId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [war, setWar] = useState<ClanWar | null>(null);
  const [clan1, setClan1] = useState<Clan | null>(null);
  const [clan2, setClan2] = useState<Clan | null>(null);
  const [players, setPlayers] = useState<{ [id: number]: PlayerInfo }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWarData();
  }, [warId]);

  const loadWarData = async () => {
    try {
      setLoading(true);

      // Load war
      const warResponse = await api.get(`/clans/wars/${warId}`);
      setWar(warResponse.data);

      // Load clans
      const clan1Response = await api.get(`/clans/${warResponse.data.clan_1_id}`);
      setClan1(clan1Response.data);

      const clan2Response = await api.get(`/clans/${warResponse.data.clan_2_id}`);
      setClan2(clan2Response.data);

      // Load players info
      const allPlayerIds = [
        ...(warResponse.data.participants.clan_1 || []),
        ...(warResponse.data.participants.clan_2 || [])
      ];

      const playersMap: { [id: number]: PlayerInfo } = {};
      for (const id of allPlayerIds) {
        const playerResponse = await api.get(`/profile/${id}`);
        playersMap[id] = playerResponse.data;
      }
      setPlayers(playersMap);
    } catch (error) {
      console.error('Failed to load war data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayBattle = async (pairIndex: number) => {
    try {
      const response = await api.post(`/clans/war/${warId}/play`);
      navigate(`/lobby/${response.data.InviteCode}`);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to start battle');
    }
  };

  const getUserPairIndex = (): number | null => {
    if (!war || !user) return null;
    const pairs = war.participants.pairs || [];
    return pairs.findIndex(
      p => p.clan_1 === user.user_id || p.clan_2 === user.user_id
    );
  };

  if (loading) {
    return (
      <div className="clan-war-page">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!war || !clan1 || !clan2) {
    return (
      <div className="clan-war-page">
        <div className="error">War not found</div>
      </div>
    );
  }

  const pairs = war.participants.pairs || [];
  const userPairIndex = getUserPairIndex();

  return (
    <div className="clan-war-page">
      {/* War Header */}
      <div className="war-header">
        <div className="clan-side">
          <div className="clan-shield">
            <div className="shield-shape">
              <span className="shield-icon">⚔</span>
            </div>
          </div>
          <div className="clan-details">
            <div className="clan-tag">[{clan1.tag}]</div>
            <div className="clan-name">{clan1.name}</div>
            <div className="clan-wins">
              <strong>{clan1.wars_won}</strong> wins
            </div>
          </div>
        </div>

        <div className="war-center">
          <div className="war-score-big">
            {war.clan_1_score}
            <span className="dash">:</span>
            {war.clan_2_score}
          </div>
          <div className="war-timer-small">{war.status.toUpperCase()}</div>
        </div>

        <div className="clan-side right">
          <div className="clan-shield">
            <div className="shield-shape">
              <span className="shield-icon">⚔</span>
            </div>
          </div>
          <div className="clan-details">
            <div className="clan-tag">[{clan2.tag}]</div>
            <div className="clan-name">{clan2.name}</div>
            <div className="clan-wins">
              <strong>{clan2.wars_won}</strong> wins
            </div>
          </div>
        </div>
      </div>

      {/* War Progress Bar */}
      <div className="war-progress">
        <div
          className="progress-filled"
          style={{ flex: war.clan_1_score || 0.1 }}
        />
        <div
          className="progress-filled-alt"
          style={{ flex: war.clan_2_score || 0.1 }}
        />
        <div
          className="progress-empty"
          style={{ flex: Math.max(0.1, war.rounds - war.clan_1_score - war.clan_2_score) }}
        />
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Matches Panel */}
        <div className="matches-panel">
          <div className="section-label">Battles ({pairs.length})</div>

          {pairs.map((pair, index) => {
            const player1 = players[pair.clan_1];
            const player2 = players[pair.clan_2];
            const isUserMatch = index === userPairIndex;

            return (
              <div
                key={index}
                className={`match-card ${isUserMatch ? 'your-match' : ''}`}
              >
                <div className="match-inner">
                  <div className="match-num">{index + 1}</div>

                  <div className="match-players">
                    {/* Player 1 */}
                    <div
                      className={`match-player ${
                        pair.winner === pair.clan_1 ? 'won' : pair.winner ? 'lost' : ''
                      }`}
                    >
                      <div className="mp-avatar">
                        {player1?.name.slice(0, 2).toUpperCase() || 'P1'}
                      </div>
                      <div className="mp-info">
                        <div className="mp-name">{player1?.name || 'Player 1'}</div>
                        <div className="mp-xp">
                          {player1?.xp.toLocaleString() || '0'} XP
                        </div>
                      </div>
                    </div>

                    {/* Match Center */}
                    <div className="match-vs">
                      {pair.status === 'completed' ? (
                        <>
                          <div className="match-result">
                            {pair.clan_1_score || 0} - {pair.clan_2_score || 0}
                          </div>
                          <div className="match-status done">finished</div>
                        </>
                      ) : pair.status === 'ongoing' ? (
                        <>
                          <div className="match-result">---</div>
                          <div className="match-status live">in progress</div>
                        </>
                      ) : (
                        <>
                          <div className="match-status wait">
                            {isUserMatch ? 'your turn' : 'waiting'}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Player 2 */}
                    <div
                      className={`match-player right-side ${
                        pair.winner === pair.clan_2 ? 'won' : pair.winner ? 'lost' : ''
                      }`}
                    >
                      <div className="mp-avatar">
                        {player2?.name.slice(0, 2).toUpperCase() || 'P2'}
                      </div>
                      <div className="mp-info">
                        <div className="mp-name">{player2?.name || 'Player 2'}</div>
                        <div className="mp-xp">
                          {player2?.xp.toLocaleString() || '0'} XP
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Play Button */}
                  {isUserMatch &&
                    pair.status === 'pending' &&
                    (!pair.clan_1_score || !pair.clan_2_score) && (
                      <button
                        onClick={() => handlePlayBattle(index)}
                        className="match-play-btn"
                      >
                        Battle
                      </button>
                    )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar */}
        <div className="sidebar">
          <div className="section-label">War Stats</div>
          <div className="war-stats">
            <div className="ws-card">
              <div className="ws-value">
                {pairs.filter(p => p.status === 'completed').length}/{pairs.length}
              </div>
              <div className="ws-label">Completed</div>
            </div>
            <div className="ws-card">
              <div className="ws-value">
                {war.xp_awarded_clan_1 + war.xp_awarded_clan_2}
              </div>
              <div className="ws-label">XP Pool</div>
            </div>
          </div>

          <button onClick={() => navigate('/clans')} className="sidebar-btn">
            Back to Clans
          </button>
        </div>
      </div>
    </div>
  );
};
