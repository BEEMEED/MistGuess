import React, { createContext, useContext, useState, useEffect, type ReactNode, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import type {
  MatchmakingContextType,
  MatchmakingState,
  WSMatchmakingEvent,
} from '../types';

const MatchmakingContext = createContext<MatchmakingContextType | undefined>(undefined);

export const useMatchmaking = () => {
  const context = useContext(MatchmakingContext);
  if (!context) {
    throw new Error('useMatchmaking must be used within MatchmakingProvider');
  }
  return context;
};

interface MatchmakingProviderProps {
  children: ReactNode;
}

export const MatchmakingProvider: React.FC<MatchmakingProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const isRedirectingRef = useRef(false);

  const [state, setState] = useState<MatchmakingState>({
    isInQueue: false,
    queuePosition: null,
    matchFound: false,
    lobbyCode: null,
    opponent: null,
    countdown: null,
    error: null,
  });

  const handleWSEvent = useCallback((event: WSMatchmakingEvent) => {
    console.log('Matchmaking WS event:', event);

    switch (event.type) {
      case 'queue_joined':
        setState((prev) => ({
          ...prev,
          isInQueue: true,
          queuePosition: event.position,
          error: null,
        }));
        break;

      case 'match_found':
        console.log('Match found!', event);
        // Play sound
        try {
          const audio = new Audio('/sounds/match-found.mp3');
          audio.volume = 0.5;
          audio.play().catch((e) => console.log('Sound play failed:', e));
        } catch (e) {
          console.log('Sound error:', e);
        }

        setState((prev) => ({
          ...prev,
          matchFound: true,
          lobbyCode: event.LobbyCode,
          opponent: event.opponent,
          error: null,
        }));
        break;

      case 'redirect':
        console.log('Redirecting to lobby:', event.LobbyCode);
        // Set redirecting flag to prevent reconnection
        isRedirectingRef.current = true;

        // Close matchmaking WebSocket
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
        setIsConnected(false);

        // Navigate to lobby with autostart parameter
        navigate(`/lobby/${event.LobbyCode}?autostart=true`);

        // Reset state (but don't clear redirecting flag yet)
        setState({
          isInQueue: false,
          queuePosition: null,
          matchFound: false,
          lobbyCode: null,
          opponent: null,
          countdown: null,
          error: null,
        });
        break;

      case 'error':
        console.error('Matchmaking error:', event.message);
        setState((prev) => ({
          ...prev,
          error: event.message,
          isInQueue: false,
        }));
        break;
    }
  }, [navigate]);

  const joinQueue = useCallback(async () => {
    if (!user?.token) {
      console.error('No user token');
      return;
    }

    if (wsRef.current) {
      console.log('Already connected');
      return;
    }

    // Don't reconnect if we're redirecting to lobby
    if (isRedirectingRef.current) {
      console.log('Skipping reconnect - redirecting to lobby');
      return;
    }

    try {
      const ws = new WebSocket(`ws://localhost:8000/mathmaking/?token=${user.token}`);

      ws.onopen = () => {
        console.log('Matchmaking WebSocket connected');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWSEvent(data);
        } catch (error) {
          console.error('Error parsing WS message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('Matchmaking WebSocket error:', error);
        setState((prev) => ({
          ...prev,
          error: 'Connection error',
          isInQueue: false,
        }));
      };

      ws.onclose = () => {
        console.log('Matchmaking WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error connecting to matchmaking:', error);
      setState((prev) => ({
        ...prev,
        error: 'Failed to connect',
      }));
    }
  }, [user, handleWSEvent]);

  const leaveQueue = useCallback(() => {
    if (wsRef.current) {
      // Send cancel message
      wsRef.current.send(JSON.stringify({ type: 'cancel_queue' }));

      // Close connection
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    isRedirectingRef.current = false; // Reset redirecting flag
    setState({
      isInQueue: false,
      queuePosition: null,
      matchFound: false,
      lobbyCode: null,
      opponent: null,
      countdown: null,
      error: null,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const resetRedirectFlag = useCallback(() => {
    isRedirectingRef.current = false;
  }, []);

  return (
    <MatchmakingContext.Provider value={{ state, joinQueue, leaveQueue, isConnected, resetRedirectFlag }}>
      {children}
    </MatchmakingContext.Provider>
  );
};
