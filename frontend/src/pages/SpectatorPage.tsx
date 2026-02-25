import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StreetViewPanorama } from '../components/game/StreetViewPanorama';
import { GuessMap } from '../components/game/GuessMap';
import { FogOverlay } from '../components/effects/FogOverlay';
import './SpectatorPage.css';

const WS_BASE_URL = 'ws://localhost:8000';

interface Player {
  user_id: number;
  name: string;
  avatar: string;
  rank: string;
}

interface Pov {
  heading: number;
  pitch: number;
  zoom: number;
}

export const SpectatorPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const wsRef = useRef<WebSocket | null>(null);
  const [pov, setPov] = useState<Pov | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [playerPosition, setPlayerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [hp, setHp] = useState<Record<string, number>>({});
  const [players, setPlayers] = useState<Player[]>([]);
  const [status, setStatus] = useState<'waiting' | 'ingame' | 'ended'>('waiting');
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [guessPreview, setGuessPreview] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!user || !code) return;

    const ws = new WebSocket(`${WS_BASE_URL}/ws/${code}/spectate?token=${user.token}`);
    wsRef.current = ws;

    ws.onopen = () => console.log('Spectator WS connected');

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);

      if (data.type === 'spectate') {
        // Only apply POV if this is the player we're watching
        if (selectedPlayerRef.current === null || data.num_player === selectedPlayerRef.current) {
          setPov({ heading: data.heading, pitch: data.pitch, zoom: data.zoom });
          if (data.lat !== undefined && data.lng !== undefined) {
            setPlayerPosition({ lat: data.lat, lng: data.lng });
          }
        }
      } else if (data.type === 'guess_preview') {
        if (selectedPlayerRef.current === null || data.num_player === selectedPlayerRef.current) {
          setGuessPreview(data.lat != null && data.lng != null ? { lat: data.lat, lng: data.lng } : null);
        }
      } else if (data.type === 'round_started') {
        setLocation({ lat: data.lat, lon: data.lon });
        setPlayerPosition(null);
        setPov(null);
        setGuessPreview(null);
        setStatus('ingame');
        if (data.hp) setHp(data.hp);
      } else if (data.type === 'game_started') {
        setHp(data.hp || {});
        setStatus('ingame');
      } else if (data.type === 'player_joined') {
        const newPlayers: Player[] = data.players || [];
        setPlayers(newPlayers);
        // Auto-select opponent (first player that's not the current user)
        setSelectedPlayer(prev => {
          if (prev !== null) return prev;
          const opponent = newPlayers.find(p => p.user_id !== user?.user_id);
          return opponent ? opponent.user_id : (newPlayers.length > 0 ? newPlayers[0].user_id : null);
        });
      } else if (data.type === 'round_ended') {
        setHp(data.hp || {});
      } else if (data.type === 'game_ended') {
        setStatus('ended');
        setTimeout(() => navigate('/'), 5000);
      }
    };

    ws.onclose = () => console.log('Spectator WS closed');

    return () => {
      ws.close();
    };
  }, [user, code]);

  // Keep selectedPlayer in a ref so the ws.onmessage closure can access latest value
  const selectedPlayerRef = useRef<number | null>(selectedPlayer);
  useEffect(() => {
    selectedPlayerRef.current = selectedPlayer;
  }, [selectedPlayer]);

  return (
    <div className="spectator-page">
      <FogOverlay />

      <div className="spectator-badge">👁 SPECTATING</div>

      {/* HP bars + player switcher */}
      {players.length > 0 && (
        <div className="spectator-hp-container">
          {players.filter(p => p.user_id !== user?.user_id).map((p) => {
            const playerHp = hp[p.user_id] || hp[String(p.user_id)] || 0;
            const pct = Math.max(0, (playerHp / 6000) * 100);
            const isWatching = selectedPlayer === p.user_id;
            return (
              <div
                key={p.user_id}
                className={`spectator-hp-panel ${isWatching ? 'spectator-hp-panel--active' : ''}`}
                onClick={() => { setSelectedPlayer(p.user_id); setPlayerPosition(null); setGuessPreview(null); }}
                title={`Watch ${p.name}`}
              >
                <img
                  src={p.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=667eea&color=fff&size=64&bold=true`}
                  alt={p.name}
                  className="spectator-avatar"
                />
                <div className="spectator-hp-info">
                  <div className="spectator-player-name-row">
                    <span className="spectator-player-name">{p.name}</span>
                    {isWatching && <span className="spectator-watching-badge">WATCHING</span>}
                  </div>
                  <div className="spectator-hp-bar-bg">
                    <div
                      className={`spectator-hp-bar-fill ${pct <= 25 ? 'hp-critical' : pct <= 50 ? 'hp-warning' : 'hp-healthy'}`}
                      style={{ width: `${pct}%` }}
                    />
                    <span className="spectator-hp-value">{playerHp}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Guess preview map */}
      {status === 'ingame' && (
        <GuessMap
          onGuess={() => {}}
          guessLocation={guessPreview}
          hasGuessed={true}
        />
      )}

      {/* Street View */}
      <div className="spectator-streetview">
        {location ? (
          <StreetViewPanorama
            key={`${location.lat}-${location.lon}`}
            lat={location.lat}
            lon={location.lon}
            externalPov={pov}
            externalPosition={playerPosition}
            disableControls
          />
        ) : (
          <div className="spectator-waiting">
            {status === 'ended' ? (
              <p>Game ended. Redirecting...</p>
            ) : (
              <>
                <div className="mistborn-spinner" />
                <p>Waiting for round to start...</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
