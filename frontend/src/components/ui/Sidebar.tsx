import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from './Avatar';
import './Sidebar.css';

interface SidebarProps {
  onSpectateClick: () => void;
  onSettingsClick: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onSpectateClick, onSettingsClick }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <nav className="sidebar">
      <div className="sidebar__logo">
        <div className="sidebar__logo-icon">M</div>
        <div className="sidebar__logo-text">MISTGUESS</div>
      </div>

      <div className="sidebar__nav">
        <div className="sidebar__item sidebar__item--play active" onClick={() => navigate('/')}>
          <div className="sidebar__icon">🌍</div>
          <span className="sidebar__label">Solo Play</span>
        </div>

        <div className="sidebar__item sidebar__item--pvp" onClick={() => navigate('/matchmaking')}>
          <div className="sidebar__icon">⚔️</div>
          <span className="sidebar__label">Quick Match</span>
        </div>

        <div className="sidebar__item sidebar__item--clans" onClick={() => navigate('/clans')}>
          <div className="sidebar__icon">🏰</div>
          <span className="sidebar__label">Clans</span>
        </div>

        <div className="sidebar__divider" />

        <div className="sidebar__item sidebar__item--spectate" onClick={onSpectateClick}>
          <div className="sidebar__icon">👁</div>
          <span className="sidebar__label">Spectate</span>
        </div>

        <div className="sidebar__item sidebar__item--guide" onClick={() => navigate('/guide')}>
          <div className="sidebar__icon">📖</div>
          <span className="sidebar__label">Guide</span>
        </div>
      </div>

      <div className="sidebar__bottom">
        <div className="sidebar__item sidebar__item--settings" onClick={onSettingsClick}>
          <div className="sidebar__icon">⚙️</div>
          <span className="sidebar__label">Settings</span>
        </div>

        <div className="sidebar__profile" onClick={() => navigate('/profile')}>
          <Avatar src={user?.avatar} size="small" />
          <div className="sidebar__profile-info">
            <span className="sidebar__profile-name">{user?.name || 'Player'}</span>
            <span className="sidebar__profile-rank">{user?.rank || 'Ashborn'}</span>
          </div>
        </div>
      </div>
    </nav>
  );
};
