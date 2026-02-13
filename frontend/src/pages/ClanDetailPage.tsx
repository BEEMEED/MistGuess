import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiService as api } from '../services/api';
import type { Clan, ClanWar, PlayerInfo } from '../types/index';
import './ClanDetailPage.css';

export const ClanDetailPage: React.FC = () => {
  const { clanId } = useParams<{ clanId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clan, setClan] = useState<Clan | null>(null);
  const [members, setMembers] = useState<PlayerInfo[]>([]);
  const [wars, setWars] = useState<ClanWar[]>([]);
  const [loading, setLoading] = useState(true);

  const isMyClan = user?.clan_id === Number(clanId);
  const isOwner = isMyClan && user?.clan_role === 'owner';

  useEffect(() => {
    loadClanData();
  }, [clanId]);

  const loadClanData = async () => {
    try {
      setLoading(true);

      // Load clan info
      const clanResponse = await api.get(`/clans/${clanId}`);
      setClan(clanResponse.data);

      // Load clan members
      const membersResponse = await api.get(`/clans/${clanId}/members`);
      setMembers(membersResponse.data);

      // Load clan wars
      const warsResponse = await api.get(`/clans/${clanId}/wars`);
      setWars(warsResponse.data);
    } catch (error) {
      console.error('Failed to load clan data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvitePlayer = async () => {
    const username = prompt('Enter player username to invite:');
    if (!username) return;

    try {
      await api.post(`/clans/${clanId}/invite`, { username });
      alert('Invite sent!');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to send invite');
    }
  };

  const handleKickMember = async (userId: number) => {
    if (!confirm('Are you sure you want to kick this member?')) return;

    try {
      await api.post(`/clans/${clanId}/kick`, { user_id: userId });
      loadClanData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to kick member');
    }
  };

  const handleDisbandClan = async () => {
    const confirm1 = confirm('Are you sure you want to disband this clan? This action cannot be undone!');
    if (!confirm1) return;

    const confirm2 = confirm('Type DISBAND to confirm:');
    if (confirm2) {
      try {
        await api.delete(`/clans/${clanId}`);
        navigate('/clans');
      } catch (error: any) {
        alert(error.response?.data?.detail || 'Failed to disband clan');
      }
    }
  };

  if (loading) {
    return (
      <div className="clan-detail-page">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!clan) {
    return (
      <div className="clan-detail-page">
        <div className="error">Clan not found</div>
      </div>
    );
  }

  return (
    <div className="clan-detail-page">
      <div className="clan-detail-header">
        <button onClick={() => navigate('/clans')} className="back-btn">
          ← Back to Clans
        </button>
      </div>

      {/* Clan Info Section */}
      <div className="clan-info-section">
        <div className="clan-banner">
          <div className="clan-shield-large">
            <div className="shield-shape-large">
              <span className="shield-icon-large">⚔</span>
            </div>
          </div>
          <div className="clan-banner-info">
            <div className="clan-tag-large">[{clan.tag}]</div>
            <div className="clan-name-large">{clan.name}</div>
            <div className="clan-desc-large">{clan.description}</div>
          </div>
        </div>

        <div className="clan-main-stats">
          <div className="main-stat">
            <div className="main-stat-value">{clan.member_count}</div>
            <div className="main-stat-label">Members</div>
          </div>
          <div className="main-stat">
            <div className="main-stat-value">{clan.xp.toLocaleString()}</div>
            <div className="main-stat-label">Total XP</div>
          </div>
          <div className="main-stat">
            <div className="main-stat-value">{clan.wars_total}</div>
            <div className="main-stat-label">Wars</div>
          </div>
          <div className="main-stat">
            <div className="main-stat-value">{clan.reputation}</div>
            <div className="main-stat-label">Reputation</div>
          </div>
        </div>

        {isOwner && (
          <div className="clan-management">
            <button onClick={handleInvitePlayer} className="mgmt-btn mgmt-btn-primary">
              Invite Player
            </button>
            <button onClick={handleDisbandClan} className="mgmt-btn mgmt-btn-danger">
              Disband Clan
            </button>
          </div>
        )}
      </div>

      {/* Members Section */}
      <div className="members-section">
        <div className="section-title">Members ({members.length})</div>
        <div className="members-list">
          {members.map(member => (
            <div key={member.user_id} className="member-card">
              <div className="member-avatar">{member.name.slice(0, 2).toUpperCase()}</div>
              <div className="member-info">
                <div className="member-name">{member.name}</div>
                <div className="member-xp">{member.xp.toLocaleString()} XP</div>
              </div>
              <div className="member-rank-badge">{member.rank}</div>
              {isOwner && member.user_id !== user?.user_id && (
                <button
                  onClick={() => handleKickMember(member.user_id)}
                  className="member-kick-btn"
                >
                  Kick
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Wars Section */}
      <div className="wars-section">
        <div className="section-title">Clan Wars ({wars.length})</div>
        {wars.length === 0 ? (
          <div className="no-wars">No wars yet</div>
        ) : (
          <div className="wars-list">
            {wars.map(war => (
              <div
                key={war.id}
                className={`war-card war-status-${war.status}`}
                onClick={() => navigate(`/clans/wars/${war.id}`)}
              >
                <div className="war-header-small">
                  <span className="war-clan">[CLAN1]</span>
                  <span className="war-vs">VS</span>
                  <span className="war-clan">[CLAN2]</span>
                </div>
                <div className="war-score-display">
                  {war.clan_1_score} : {war.clan_2_score}
                </div>
                <div className={`war-status-badge war-status-${war.status}`}>
                  {war.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
