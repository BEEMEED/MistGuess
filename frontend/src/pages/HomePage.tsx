import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { MistbornButton } from '../components/ui/MistbornButton';
import { RoundResultOverlay } from '../components/game/RoundResultOverlay';
import { SettingsOverlay } from '../components/game/SettingsOverlay';
import { GuessMap } from '../components/game/GuessMap';
import { FogOverlay } from '../components/effects/FogOverlay';
import { AshParticles } from '../components/effects/AshParticles';
import './HomePage.css';

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [guessMarker, setGuessMarker] = useState<{ lat: number; lng: number } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [distance, setDistance] = useState(0);
  const [points, setPoints] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showSpectate, setShowSpectate] = useState(false);
  const [spectateCode, setSpectateCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapsLoaded, setMapsLoaded] = useState(false);

  // Timer state
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerDuration, setTimerDuration] = useState(120); // Default 2 minutes in seconds
  const [roundStartTime, setRoundStartTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Refs for Google Maps instances
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const streetViewDivRef = useRef<HTMLDivElement>(null);
  const timerExpiredRef = useRef<boolean>(false);

  // Wait for Google Maps to load
  useEffect(() => {
    if (window.google?.maps) {
      setMapsLoaded(true);
    } else {
      const checkGoogleMaps = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(checkGoogleMaps);
          setMapsLoaded(true);
        }
      }, 100);

      return () => clearInterval(checkGoogleMaps);
    }
  }, []);

  // Guess map is now handled by GuessMap component

  // Load first round when maps are loaded
  useEffect(() => {
    if (mapsLoaded) {
      loadNewRound();
    }
  }, [mapsLoaded]);

  // Initialize Street View with JavaScript API when location changes
  useEffect(() => {
    if (currentLocation && streetViewDivRef.current && mapsLoaded) {
      const { lat, lon } = currentLocation;

      console.log('Initializing Street View at:', { lat, lon });

      // Clear previous content
      streetViewDivRef.current.innerHTML = '';

      // Create a new div for panorama
      const panoDiv = document.createElement('div');
      panoDiv.style.width = '100%';
      panoDiv.style.height = '100%';
      streetViewDivRef.current.appendChild(panoDiv);

      // Initialize Street View Service
      const streetViewService = new window.google.maps.StreetViewService();

      streetViewService.getPanorama(
        {
          location: { lat, lng: lon },
          radius: 50,
          source: window.google.maps.StreetViewSource.OUTDOOR,
        },
        (data: any, status: any) => {
          if (status === window.google.maps.StreetViewStatus.OK) {
            const panorama = new window.google.maps.StreetViewPanorama(panoDiv, {
              position: data.location.latLng,
              pov: { heading: 0, pitch: 0 },
              zoom: 1,
              addressControl: false,
              showRoadLabels: false,
              zoomControl: true,
              fullscreenControl: false,
              enableCloseButton: false,
              linksControl: true,
              panControl: true,
              motionTracking: false,
              motionTrackingControl: false,
            });

            panoramaRef.current = panorama;
            console.log('Street View initialized successfully!');
          } else {
            panoDiv.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:white;font-size:18px;">No Street View available</div>';
          }
        }
      );
    }
  }, [currentLocation, mapsLoaded]);

  // Timer countdown logic
  useEffect(() => {
    console.log('Timer useEffect triggered:', { timerEnabled, roundStartTime, showResult });

    if (!timerEnabled || !roundStartTime || showResult) {
      console.log('Timer useEffect early return');
      return;
    }

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - roundStartTime) / 1000);
      const remaining = Math.max(0, timerDuration - elapsed);
      console.log('Timer update:', { elapsed, remaining, timerDuration, timerExpired: timerExpiredRef.current });
      setTimeRemaining(remaining);

      if (remaining === 0 && !showResult && currentLocation && !timerExpiredRef.current) {
        // Time's up!
        console.log('Timer expired!');
        timerExpiredRef.current = true; // Mark as expired to prevent double trigger

        if (guessMarker) {
          // Player made a guess - calculate distance
          const dist = calculateDistance(
            guessMarker.lat,
            guessMarker.lng,
            currentLocation.lat,
            currentLocation.lon
          );
          const pts = calculatePoints(dist);
          setDistance(dist);
          setPoints(pts);
        } else {
          // Player didn't make a guess - 0 points and max distance
          setDistance(20000); // Maximum distance (around half the Earth's circumference)
          setPoints(0);
        }
        setShowResult(true);
      }
    };

    console.log('Starting timer interval');
    updateTimer();
    const interval = setInterval(updateTimer, 100); // Update every 100ms for smooth countdown

    return () => {
      console.log('Cleaning up timer interval');
      clearInterval(interval);
    };
  }, [timerEnabled, roundStartTime, timerDuration, showResult, guessMarker, currentLocation]);

  const loadNewRound = async () => {
    try {
      setLoading(true);
      setError('');
      setGuessMarker(null);
      timerExpiredRef.current = false; // Reset timer expired flag

      const data = await apiService.getSoloRound();
      console.log('Received location data:', data);
      setCurrentLocation(data);

      // Start timer if enabled
      if (timerEnabled) {
        const startTime = Date.now();
        console.log('Starting new round with timer:', { timerEnabled, timerDuration, startTime });
        setRoundStartTime(startTime);
        setTimeRemaining(timerDuration);
      } else {
        console.log('Starting new round without timer');
        setRoundStartTime(null);
        setTimeRemaining(null);
      }
    } catch (err: any) {
      console.error('Failed to load solo round:', err);
      setError('Failed to load location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const calculatePoints = (distanceKm: number): number => {
    // Score based on distance: max 5000 points at 0km, decreasing with distance
    const maxPoints = 5000;
    const distancePenalty = Math.min(distanceKm / 2, maxPoints);
    return Math.max(0, Math.round(maxPoints - distancePenalty));
  };

  const handleGuess = (lat: number, lon: number) => {
    setGuessMarker({ lat, lng: lon });
  };

  const handleMakeGuess = () => {
    if (!guessMarker || !currentLocation) {
      return;
    }

    const dist = calculateDistance(
      guessMarker.lat,
      guessMarker.lng,
      currentLocation.lat,
      currentLocation.lon
    );
    const pts = calculatePoints(dist);

    setDistance(dist);
    setPoints(pts);
    setShowResult(true);
  };

  const handleContinue = () => {
    console.log('handleContinue called');
    setShowResult(false);
    loadNewRound();
  };

  if (!mapsLoaded) {
    return (
      <div className="home-page">
        <FogOverlay />
        <AshParticles />
        <div className="home-page__loading">Loading Google Maps...</div>
      </div>
    );
  }

  if (loading && !currentLocation) {
    return (
      <div className="home-page">
        <FogOverlay />
        <AshParticles />
        <div className="home-page__loading">Loading location...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-page">
        <FogOverlay />
        <AshParticles />
        <div className="home-page__error">
          <p>{error}</p>
          <MistbornButton onClick={loadNewRound}>Try Again</MistbornButton>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <FogOverlay />
      <AshParticles />

      {/* Time warning overlay - intensifying fog/vignette */}
      {timerEnabled && timeRemaining !== null && timeRemaining <= 30 && (
        <div
          className="time-warning-overlay"
          style={{
            opacity: Math.max(0, 1 - (timeRemaining / 30)),
          }}
        />
      )}

      {/* Timer overlay - top center */}
      {timerEnabled && timeRemaining !== null && (
        <div className={`timer-overlay ${timeRemaining <= 10 ? 'timer-warning' : ''}`}>
          <div className="timer-icon">⏱</div>
          <span className="timer-value">
            {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
          </span>
        </div>
      )}

      {/* Quick Match Button - top left */}
      <button className="home-page__quick-match-btn" onClick={() => navigate('/matchmaking')} title="Quick Match 1v1">
        ⚔️
      </button>

      {/* Guide Button - top left, next to Quick Match */}
      <button className="home-page__guide-btn" onClick={() => navigate('/guide')} title="How to Play">
        📖
      </button>

      {/* Clans Button - top left */}
      <button className="home-page__clans-btn" onClick={() => navigate('/clans')} title="Clans">
        ⚔️
      </button>

      {/* Spectate Button */}
      <button className="home-page__spectate-btn" onClick={() => setShowSpectate(true)} title="Spectate a game">
        👁
      </button>

      {/* Settings Button - always visible */}
      <button className="home-page__settings-btn" onClick={() => setShowSettings(true)}>
        ⚙️
      </button>

      {/* Street View Container */}
      <div ref={streetViewDivRef} className="home-page__street-view" />

      {/* Mini Map for Guessing */}
      <GuessMap
        onGuess={handleGuess}
        guessLocation={guessMarker}
        hasGuessed={showResult}
      />

      {/* Guess Button */}
      {!showResult && (
        <div className="home-page__guess-btn-container">
          <MistbornButton
            onClick={handleMakeGuess}
            disabled={!guessMarker}
            fullWidth
          >
            Make Guess
          </MistbornButton>
        </div>
      )}

      {/* Round Result Overlay */}
      {showResult && currentLocation && (
        <RoundResultOverlay
          guessLat={guessMarker?.lat || 0}
          guessLon={guessMarker?.lng || 0}
          actualLat={currentLocation.lat}
          actualLon={currentLocation.lon}
          distance={distance}
          points={points}
          onContinue={handleContinue}
        />
      )}

      {/* Spectate Overlay */}
      {showSpectate && (
        <div className="spectate-overlay" onClick={() => setShowSpectate(false)}>
          <div className="spectate-overlay__card" onClick={e => e.stopPropagation()}>
            <h2 className="spectate-overlay__title">👁 Spectate Game</h2>
            <p className="spectate-overlay__hint">Enter the lobby invite code to watch</p>
            <input
              className="spectate-overlay__input"
              type="text"
              placeholder="Invite code..."
              value={spectateCode}
              onChange={e => setSpectateCode(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && spectateCode.trim()) {
                  navigate(`/spectate/${spectateCode.trim()}`);
                }
              }}
              autoFocus
            />
            <div className="spectate-overlay__actions">
              <button
                className="spectate-overlay__btn spectate-overlay__btn--watch"
                disabled={!spectateCode.trim()}
                onClick={() => navigate(`/spectate/${spectateCode.trim()}`)}
              >
                Watch
              </button>
              <button
                className="spectate-overlay__btn spectate-overlay__btn--cancel"
                onClick={() => setShowSpectate(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Overlay */}
      {showSettings && (
        <SettingsOverlay
          onClose={() => setShowSettings(false)}
          timerEnabled={timerEnabled}
          timerDuration={timerDuration}
          onTimerEnabledChange={setTimerEnabled}
          onTimerDurationChange={setTimerDuration}
        />
      )}
    </div>
  );
};
