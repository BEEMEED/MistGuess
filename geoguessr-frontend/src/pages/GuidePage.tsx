import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MistbornButton } from '../components/ui/MistbornButton';
import { MistbornCard } from '../components/ui/MistbornCard';
import { FogOverlay } from '../components/effects/FogOverlay';
import { RainEffect } from '../components/effects/RainEffect';
import { TargetLogo } from '../components/ui/TargetLogo';
import './GuidePage.css';

export const GuidePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="guide-page">
      <FogOverlay />
      <RainEffect />

      <div className="guide-container">
        {/* Header with logo */}
        <div className="guide-header">
          <TargetLogo size={150} />
          <h1 className="guide-title">MistGuess</h1>
          <p className="guide-subtitle">Navigate through the mists. Discover the world. Prove your worth.</p>
        </div>

        {/* About Section */}
        <MistbornCard className="guide-section">
          <h2 className="section-title">About the Game</h2>
          <p className="section-text">
            Welcome to MistGuess - a dark geography challenge where you navigate through unknown territories
            using Street View. Test your knowledge against the shadows, compete with other travelers,
            and prove your mastery of the world's hidden places.
          </p>
          <div className="feature-grid">
            <div className="feature-item">
              <h3>Explore the Unknown</h3>
              <p>Discover mysterious locations shrouded in mist</p>
            </div>
            <div className="feature-item">
              <h3>Competitive Battles</h3>
              <p>Face other players in Quick Match duels</p>
            </div>
            <div className="feature-item">
              <h3>Rise Through Ranks</h3>
              <p>Earn XP and climb from Ashborn to legend</p>
            </div>
            <div className="feature-item">
              <h3>Communicate</h3>
              <p>Exchange knowledge with fellow travelers</p>
            </div>
          </div>
        </MistbornCard>

        {/* How to Play Section */}
        <MistbornCard className="guide-section">
          <h2 className="section-title">How to Play</h2>

          <div className="steps-container">
            <div className="step-item">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Create or Join a Lobby</h3>
                <p>
                  Click <strong>"Create Lobby"</strong> on the home page to start a new game,
                  or use <strong>"Quick Match ⚔️"</strong> to find an opponent automatically.
                  You can also join existing lobbies with an invite code.
                </p>
              </div>
            </div>

            <div className="step-item">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Wait for Players</h3>
                <p>
                  In the lobby, wait for other players to join. The host can configure
                  the number of rounds (1-10) and time limit per round. When ready,
                  the host starts the game.
                </p>
              </div>
            </div>

            <div className="step-item">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Explore the Location</h3>
                <p>
                  You'll be placed in a random Street View location. Use your mouse to
                  look around and navigate. Pay attention to signs, landmarks, vegetation,
                  and architecture to determine where you are.
                </p>
              </div>
            </div>

            <div className="step-item">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>Make Your Guess</h3>
                <p>
                  Click on the mini map (bottom right) to place your guess. You can zoom
                  and pan the map to find the exact location. Once you're confident,
                  click <strong>"Submit Guess"</strong> to lock in your answer.
                </p>
              </div>
            </div>

            <div className="step-item">
              <div className="step-number">5</div>
              <div className="step-content">
                <h3>View Results</h3>
                <p>
                  After all players submit their guesses (or time runs out), you'll see
                  the results showing everyone's guesses, distances, and scores. The closer
                  you are to the actual location, the more points you earn!
                </p>
              </div>
            </div>

            <div className="step-item">
              <div className="step-number">6</div>
              <div className="step-content">
                <h3>Win the Game</h3>
                <p>
                  After all rounds are completed, the player with the highest total score
                  wins! Check the final scoreboard to see rankings and earn XP based on
                  your performance.
                </p>
              </div>
            </div>
          </div>
        </MistbornCard>

        {/* Scoring Section */}
        <MistbornCard className="guide-section">
          <h2 className="section-title">Scoring System</h2>
          <div className="scoring-info">
            <p className="section-text">
              Your score is calculated based on the distance between your guess and the
              actual location:
            </p>
            <div className="scoring-breakdown">
              <div className="scoring-item perfect">
                <span className="distance">0-10 km</span>
                <span className="score-range">~4800-5000 points</span>
                <span className="badge">Perfect!</span>
              </div>
              <div className="scoring-item excellent">
                <span className="distance">10-50 km</span>
                <span className="score-range">~4000-4800 points</span>
                <span className="badge">Excellent</span>
              </div>
              <div className="scoring-item great">
                <span className="distance">50-200 km</span>
                <span className="score-range">~3000-4000 points</span>
                <span className="badge">Great</span>
              </div>
              <div className="scoring-item good">
                <span className="distance">200-500 km</span>
                <span className="score-range">~2000-3000 points</span>
                <span className="badge">Good</span>
              </div>
              <div className="scoring-item okay">
                <span className="distance">500+ km</span>
                <span className="score-range">0-2000 points</span>
                <span className="badge">Keep trying!</span>
              </div>
            </div>
          </div>
        </MistbornCard>

        {/* Tips Section */}
        <MistbornCard className="guide-section">
          <h2 className="section-title">Traveler's Wisdom</h2>
          <div className="tips-grid">
            <div className="tip-item">
              <p><strong>Observe vehicles:</strong> Cars, license plates, and traffic patterns reveal regional secrets</p>
            </div>
            <div className="tip-item">
              <p><strong>Study architecture:</strong> Building styles whisper tales of their origins</p>
            </div>
            <div className="tip-item">
              <p><strong>Read the land:</strong> Climate and vegetation are nature's signposts</p>
            </div>
            <div className="tip-item">
              <p><strong>Decipher signs:</strong> Language and symbols hold the key to location</p>
            </div>
            <div className="tip-item">
              <p><strong>Follow shadows:</strong> The sun's path reveals which hemisphere you stand in</p>
            </div>
            <div className="tip-item">
              <p><strong>Notice details:</strong> Street View cameras differ across nations and eras</p>
            </div>
          </div>
        </MistbornCard>

        {/* Back button */}
        <div className="guide-actions">
          <MistbornButton
            variant="primary"
            onClick={() => navigate('/')}
            className="back-home-btn"
          >
            ← Back to Home
          </MistbornButton>
        </div>
      </div>
    </div>
  );
};
