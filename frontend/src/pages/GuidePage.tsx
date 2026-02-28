import React from 'react';
import { useNavigate } from 'react-router-dom';
import './GuidePage.css';

export const GuidePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="guide-page">
      <div className="guide-container">

        <div className="guide-header">
          <div className="guide-logo-mark">M</div>
          <h1 className="guide-title">MistGuess</h1>
          <p className="guide-subtitle">Navigate through the mists. Discover the world. Prove your worth.</p>
        </div>

        {/* About Section */}
        <div className="guide-card guide-section">
          <h2 className="section-title">About the Game</h2>
          <p className="section-text">
            Welcome to MistGuess — a dark geography challenge where you navigate through unknown territories
            using Street View. Test your knowledge against the shadows, compete with other travelers,
            and prove your mastery of the world's hidden places.
          </p>
          <div className="feature-grid">
            <div className="feature-item">
              <span className="feature-icon">🌍</span>
              <h3>Explore the Unknown</h3>
              <p>Discover mysterious locations shrouded in mist</p>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⚔️</span>
              <h3>Competitive Battles</h3>
              <p>Face other players in Quick Match duels</p>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📈</span>
              <h3>Rise Through Ranks</h3>
              <p>Earn XP and climb from Ashborn to legend</p>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🏰</span>
              <h3>Clans</h3>
              <p>Join forces and compete in clan wars</p>
            </div>
          </div>
        </div>

        {/* How to Play Section */}
        <div className="guide-card guide-section">
          <h2 className="section-title">How to Play</h2>
          <div className="steps-container">
            {[
              {
                n: 1, title: 'Create or Join a Lobby',
                text: 'Use Quick Match ⚔️ to find an opponent automatically, or create/join a lobby with an invite code.',
              },
              {
                n: 2, title: 'Wait for Players',
                text: 'In the lobby, wait for other players to join. The host configures rounds and time limit, then starts the game.',
              },
              {
                n: 3, title: 'Explore the Location',
                text: 'You\'ll be placed in a random Street View location. Look around and navigate — pay attention to signs, architecture, and vegetation.',
              },
              {
                n: 4, title: 'Make Your Guess',
                text: 'Click on the mini map to place your guess. Zoom and pan to find the exact spot, then click Submit.',
              },
              {
                n: 5, title: 'View Results',
                text: 'After all players submit, see everyone\'s guesses, distances, and scores. Closer = more points.',
              },
              {
                n: 6, title: 'Win the Game',
                text: 'After all rounds, the player with the highest total score wins. Earn XP and climb the leaderboard.',
              },
            ].map(({ n, title, text }) => (
              <div className="step-item" key={n}>
                <div className="step-number">{n}</div>
                <div className="step-content">
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scoring Section */}
        <div className="guide-card guide-section">
          <h2 className="section-title">Scoring System</h2>
          <p className="section-text">
            Score is based on the distance between your guess and the actual location:
          </p>
          <div className="scoring-breakdown">
            {[
              { label: '0 – 10 km',   range: '4800 – 5000 pts', badge: 'Perfect',    cls: 'perfect'   },
              { label: '10 – 50 km',  range: '4000 – 4800 pts', badge: 'Excellent',  cls: 'excellent' },
              { label: '50 – 200 km', range: '3000 – 4000 pts', badge: 'Great',      cls: 'great'     },
              { label: '200 – 500 km',range: '2000 – 3000 pts', badge: 'Good',       cls: 'good'      },
              { label: '500+ km',     range: '0 – 2000 pts',    badge: 'Keep trying',cls: 'okay'      },
            ].map(({ label, range, badge, cls }) => (
              <div className={`scoring-item ${cls}`} key={cls}>
                <span className="distance">{label}</span>
                <span className="score-range">{range}</span>
                <span className="badge">{badge}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tips Section */}
        <div className="guide-card guide-section">
          <h2 className="section-title">Traveler's Wisdom</h2>
          <div className="tips-grid">
            {[
              { title: 'Observe vehicles', text: 'Cars, plates, and traffic patterns reveal regional secrets' },
              { title: 'Study architecture', text: 'Building styles whisper tales of their origins' },
              { title: 'Read the land', text: 'Climate and vegetation are nature\'s signposts' },
              { title: 'Decipher signs', text: 'Language and symbols hold the key to location' },
              { title: 'Follow shadows', text: 'The sun\'s path reveals which hemisphere you\'re in' },
              { title: 'Notice details', text: 'Street View cameras differ across nations and eras' },
            ].map(({ title, text }) => (
              <div className="tip-item" key={title}>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="guide-actions">
          <button className="guide-back-btn" onClick={() => navigate('/')}>
            ← Back to Home
          </button>
        </div>

      </div>
    </div>
  );
};
