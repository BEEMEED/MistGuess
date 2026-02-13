import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import type { Clan } from '../types/index';
import './ClansPage.css';

export const ClansPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [myClan, setMyClan] = useState<Clan | null>(null);
  const [allClans, setAllClans] = useState<Clan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [clanName, setClanName] = useState('');
  const [clanTag, setClanTag] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load my clan if user has one
      if (user?.clan_id) {
        const myClanData = await apiService.getClan(user.clan_id);
        setMyClan(myClanData);
      }

      // Load all clans
      const allClansData = await apiService.getAllClans();
      setAllClans(allClansData);
    } catch (error) {
      console.error('Failed to load clans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClan = async () => {
    if (!clanName.trim() || !clanTag.trim()) return;

    try {
      await apiService.createClan(
        clanName,
        clanTag,
        description || 'No description'
      );

      setShowCreateModal(false);
      setClanName('');
      setClanTag('');
      setDescription('');

      // Reload user and clans
      window.location.reload();
    } catch (error: any) {
      alert(error.message || 'Failed to create clan');
    }
  };

  const handleLeaveClan = async () => {
    if (!confirm('Are you sure you want to leave this clan?')) return;

    try {
      await apiService.leaveClan();
      window.location.reload();
    } catch (error: any) {
      alert(error.message || 'Failed to leave clan');
    }
  };

  if (loading) {
    return (
      <div className="clans-page">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="clans-page">
      <div className="clans-header">
        <h1>Clans</h1>
        <button onClick={() => navigate('/')} className="back-btn">
          Back to Home
        </button>
      </div>

      {/* My Clan Section */}
      {myClan ? (
        <div className="my-clan-section">
          <div className="section-title">My Clan</div>
          <div className="clan-card my-clan-card">
            <div className="clan-card-header">
              <div className="clan-shield">
                <div className="shield-shape">
                  <span className="shield-icon">⚔</span>
                </div>
              </div>
              <div className="clan-info">
                <div className="clan-tag">[{myClan.tag}]</div>
                <div className="clan-name">{myClan.name}</div>
                <div className="clan-desc">{myClan.description}</div>
              </div>
            </div>

            <div className="clan-stats-grid">
              <div className="stat-box">
                <div className="stat-value">{myClan.member_count}</div>
                <div className="stat-label">Members</div>
              </div>
              <div className="stat-box">
                <div className="stat-value">{myClan.xp.toLocaleString()}</div>
                <div className="stat-label">XP</div>
              </div>
              <div className="stat-box">
                <div className="stat-value">{myClan.wars_won}</div>
                <div className="stat-label">Wars Won</div>
              </div>
              <div className="stat-box">
                <div className="stat-value">{myClan.reputation}</div>
                <div className="stat-label">Reputation</div>
              </div>
            </div>

            <div className="clan-actions">
              <button
                onClick={() => navigate(`/clans/${myClan.id}`)}
                className="clan-btn clan-btn-primary"
              >
                Manage Clan
              </button>
              {user?.clan_role !== 'owner' && (
                <button
                  onClick={handleLeaveClan}
                  className="clan-btn clan-btn-danger"
                >
                  Leave Clan
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="no-clan-section">
          <div className="no-clan-message">
            <h2>You're not in a clan</h2>
            <p>Create your own clan or join an existing one to participate in clan wars!</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="clan-btn clan-btn-large"
            >
              Create Clan
            </button>
          </div>
        </div>
      )}

      {/* All Clans Section */}
      <div className="all-clans-section">
        <div className="section-title">All Clans ({allClans.length})</div>
        <div className="clans-grid">
          {allClans.map(clan => (
            <div key={clan.id} className="clan-card">
              <div className="clan-card-header-small">
                <div className="clan-shield-small">
                  <div className="shield-shape-small">
                    <span className="shield-icon-small">⚔</span>
                  </div>
                </div>
                <div className="clan-info-small">
                  <div className="clan-tag-small">[{clan.tag}]</div>
                  <div className="clan-name-small">{clan.name}</div>
                </div>
              </div>

              <div className="clan-stats-small">
                <div className="stat-item-small">
                  <span className="stat-label-small">Members:</span>
                  <span className="stat-value-small">{clan.member_count}</span>
                </div>
                <div className="stat-item-small">
                  <span className="stat-label-small">Wars:</span>
                  <span className="stat-value-small">{clan.wars_total}</span>
                </div>
                <div className="stat-item-small">
                  <span className="stat-label-small">XP:</span>
                  <span className="stat-value-small">{clan.xp.toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={() => navigate(`/clans/${clan.id}`)}
                className="clan-btn clan-btn-small"
              >
                View
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Create Clan Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Create Clan</h2>
            <div className="form-group">
              <label>Clan Name (max 15 chars)</label>
              <input
                type="text"
                value={clanName}
                onChange={e => setClanName(e.target.value.slice(0, 15))}
                placeholder="Enter clan name"
                maxLength={15}
              />
            </div>
            <div className="form-group">
              <label>Clan Tag (max 5 chars)</label>
              <input
                type="text"
                value={clanTag}
                onChange={e => setClanTag(e.target.value.slice(0, 5).toUpperCase())}
                placeholder="CLAN"
                maxLength={5}
              />
            </div>
            <div className="form-group">
              <label>Description (optional, max 150 chars)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value.slice(0, 150))}
                placeholder="Enter clan description"
                maxLength={150}
                rows={3}
              />
            </div>
            <div className="modal-actions">
              <button onClick={handleCreateClan} className="clan-btn clan-btn-primary">
                Create
              </button>
              <button onClick={() => setShowCreateModal(false)} className="clan-btn">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
