import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LobbyProvider } from './context/LobbyContext';
import { MatchmakingProvider } from './context/MatchmakingContext';
import { HomePage } from './pages/HomePage';
import { GoogleCallbackPage } from './pages/GoogleCallbackPage';
import { LobbyPage } from './pages/LobbyPage';
import { GamePage } from './pages/GamePage';
import { RoundResultsPage } from './pages/RoundResultsPage';
import { FinalResultsPage } from './pages/FinalResultsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';
import { AddLocationPage } from './pages/AddLocationPage';
import { MatchmakingPage } from './pages/MatchmakingPage';
import { GuidePage } from './pages/GuidePage';
import { LeaderboardPage } from './pages/LeaderboardPage';

function App() {
  return (
    <AuthProvider>
      <LobbyProvider>
        <Router>
          <MatchmakingProvider>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admin/add-location" element={<AddLocationPage />} />
              <Route path="/guide" element={<GuidePage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/matchmaking" element={<MatchmakingPage />} />
              <Route path="/lobby/:code" element={<LobbyPage />} />
              <Route path="/game/:code" element={<GamePage />} />
              <Route path="/results/:code" element={<RoundResultsPage />} />
              <Route path="/final/:code" element={<FinalResultsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </MatchmakingProvider>
        </Router>
      </LobbyProvider>
    </AuthProvider>
  );
}

export default App;
