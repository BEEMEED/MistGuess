import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { apiService } from '../services/api';
import { wsService } from '../services/websocket';
import { Toast } from '../components/ui/Toast';
import type {
  LobbyContextType,
  GameState,
  Location,
  WSEvent,
  RoundResult,
  PlayerGuess,
} from '../types/index';

const LobbyContext = createContext<LobbyContextType | undefined>(undefined);

// LocalStorage keys
const STORAGE_KEYS = {
  LOBBY_CODE: 'geoguessr_current_lobby',
  RECONNECT_ATTEMPT: 'geoguessr_reconnect_attempt',
};

// Helper functions for localStorage
const saveLobbyToStorage = (lobbyCode: string) => {
  try {
    localStorage.setItem(STORAGE_KEYS.LOBBY_CODE, lobbyCode);
    localStorage.setItem(STORAGE_KEYS.RECONNECT_ATTEMPT, Date.now().toString());
  } catch (error) {
    console.error('Failed to save lobby to localStorage:', error);
  }
};

const getLobbyFromStorage = (): string | null => {
  try {
    const lobbyCode = localStorage.getItem(STORAGE_KEYS.LOBBY_CODE);
    const attemptTime = localStorage.getItem(STORAGE_KEYS.RECONNECT_ATTEMPT);

    // Only reconnect if saved within last 30 minutes
    if (lobbyCode && lobbyCode !== 'undefined' && attemptTime) {
      const timeDiff = Date.now() - parseInt(attemptTime);
      if (timeDiff < 30 * 60 * 1000) { // 30 minutes
        return lobbyCode;
      }
    }

    // Clear old data
    clearLobbyFromStorage();
    return null;
  } catch (error) {
    console.error('Failed to get lobby from localStorage:', error);
    return null;
  }
};

const clearLobbyFromStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.LOBBY_CODE);
    localStorage.removeItem(STORAGE_KEYS.RECONNECT_ATTEMPT);
  } catch (error) {
    console.error('Failed to clear lobby from localStorage:', error);
  }
};

export const useLobby = () => {
  const context = useContext(LobbyContext);
  if (!context) {
    throw new Error('useLobby must be used within LobbyProvider');
  }
  return context;
};

interface LobbyProviderProps {
  children: ReactNode;
}

export const LobbyProvider: React.FC<LobbyProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ player: string; message: string; timestamp: number }>>([]);
  const [disconnectedPlayers, setDisconnectedPlayers] = useState<Set<string>>(new Set());
  const [playerStatusNotification, setPlayerStatusNotification] = useState<{
    message: string;
    show: boolean;
  }>({ message: '', show: false });

  const handleWSEvent = useCallback((event: WSEvent) => {
    console.log('Processing WS event:', event);

    switch (event.type) {
      case 'player_joined':
        setGameState((prev) =>
          prev
            ? {
                ...prev,
                players: event.players,
                host: event.host || prev.host,
              }
            : null
        );
        break;

      case 'player_left':
        setGameState((prev) =>
          prev
            ? {
                ...prev,
                players: event.players,
              }
            : null
        );
        break;

      case 'game_started':
        setGameState((prev) => {
          if (!prev) return null;

          const newState = {
            ...prev,
            isGameStarted: true,
            hp: event.hp,
          };

          if (user?.user_id === prev.host) {
            setTimeout(() => wsService.startRound(), 500);
          }

          return newState;
        });
        break;

      case 'round_started':
        console.log('round_started event received:', event);
        setGameState((prev) => {
          console.log('Previous state:', prev);
          const newState = prev
            ? {
                ...prev,
                currentLocationIndex: (prev.currentLocationIndex || 0) + 1,
                currentLocation: {
                  lat: event.lat,
                  lon: event.lon,
                  url: event.url,
                },
                playersGuessed: [],
                roundTimer: event.timer,
                roundStartTime: event.RoundStartTime || Date.now(),
                hp: prev.hp || {},
              }
            : null;
          console.log('New state after round_started:', newState);
          return newState;
        });
        break;

      case 'player_guessed':
        setGameState((prev) =>
          prev
            ? {
                ...prev,
                playersGuessed: [...prev.playersGuessed, event.player.toString()],
              }
            : null
        );
        break;

      case 'round_ended':
        console.log('round_ended event received:', event);
        setGameState((prev) => {
          if (!prev) return prev;

          // Find winner's data in results
          const winnerData = event.results.find(r => r.player === event.winner);

          const roundResult: RoundResult = {
            round: (prev.currentRound || prev.roundResults.length + 1),
            targetLocation: {
              lat: event.lat,
              lon: event.lon,
              url: prev.currentLocation?.url || '',
            },
            guesses: event.results,
            winner: {
              player: event.winner,
              distance: winnerData?.distance || 0,
            },
            damage: event.damage,
            hp: event.hp,
          };

          console.log('Created roundResult:', roundResult);
          const newState = {
            ...prev,
            hp: event.hp,
            roundResults: [...prev.roundResults, roundResult],
            playersGuessed: [],
            currentRound: (prev.currentRound || 0) + 1,
          };
          console.log('New state after round_ended:', newState);
          return newState;
        });
        break;

      case 'round_timedout':
        console.log('round_timedout event received:', event);
        setGameState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            hp: event.hp,
            playersGuessed: [],
          };
        });
        break;

      case 'game_ended':
        console.log('game_ended event received:', event);
        setGameState((prev) => {
          const newState = prev
            ? {
                ...prev,
                players: event.players || prev.players,
                isGameEnded: true,
                finalResults: {
                  winner: event.winner,
                  totalDistances: event.total_distances,
                },
              }
            : null;
          console.log('New state after game_ended:', newState);
          return newState;
        });
        break;

      case 'broadcast':
        setChatMessages((prev) => {
          const newMessage = {
            player: event.player,
            message: event.message,
            timestamp: Date.now(),
          };

          // Предотвратить дубликаты (если то же сообщение от того же игрока в течение 1 секунды)
          const isDuplicate = prev.some(
            (msg) =>
              msg.player === newMessage.player &&
              msg.message === newMessage.message &&
              Date.now() - msg.timestamp < 1000
          );

          if (isDuplicate) {
            return prev;
          }

          return [...prev, newMessage];
        });
        break;

      case 'rank_up':
        console.log('LobbyContext received rank_up event:', event);
        // Save rank ups and update player ranks in gameState
        setGameState((prev) => {
          if (!prev) return prev;

          const updatedPlayers = prev.players.map((player) => {
            const rankUp = event.rank_ups.find((ru) => ru.user_id === player.user_id);
            if (rankUp) {
              return { ...player, rank: rankUp.new_rank };
            }
            return player;
          });

          return {
            ...prev,
            players: updatedPlayers,
            rankUps: event.rank_ups
          };
        });
        break;

      case 'timer_short':
        console.log('Timer shortened:', event);
        setGameState((prev) => {
          if (!prev) return prev;

          return {
            ...prev,
            roundTimer: event.timer, // New shortened timer
            roundStartTime: Date.now(), // Reset countdown from now
          };
        });
        break;

      case 'player_disconnected':
        console.log('Player disconnected:', event.player);
        setGameState((prevState) => {
          const playerName = prevState?.players.find((p) => p.user_id === event.player)?.name || `User${event.player}`;
          setDisconnectedPlayers((prev) => new Set(prev).add(event.player.toString()));
          setPlayerStatusNotification({
            message: `${playerName} disconnected. Waiting for reconnection...`,
            show: true,
          });
          setTimeout(() => {
            setPlayerStatusNotification({ message: '', show: false });
          }, 5000);
          return prevState;
        });
        break;

      case 'player_reconnected':
        console.log('Player reconnected:', event.player);
        setGameState((prevState) => {
          const playerName = prevState?.players.find((p) => p.user_id === event.player)?.name || `User${event.player}`;
          setDisconnectedPlayers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(event.player.toString());
            return newSet;
          });
          setPlayerStatusNotification({
            message: `${playerName} reconnected!`,
            show: true,
          });
          setTimeout(() => {
            setPlayerStatusNotification({ message: '', show: false });
          }, 3000);
          return prevState;
        });
        break;

      case 'reconnect_succes':
        setIsReconnecting(false);
        console.log('Reconnect successful, restoring game state:', event);
        console.log('Game state details:', {
          hasGameState: !!event.game_state,
          currentRound: event.game_state?.current_round,
          roundStartTime: event.game_state?.roundstart_time,
          timer: event.game_state?.timer,
          playerGuess: event.game_state?.player_guess,
        });
        setGameState((prev) => {
          const baseState = {
            lobbyCode: prev?.lobbyCode || '',
            players: event.players,
            host: event.host,
            maxPlayers: event.max_players,
            totalRounds: event.total_rounds,
            currentRound: 0,
            isGameStarted: false,
            isGameEnded: false,
            currentLocation: null,
            playersGuessed: [],
            roundResults: prev?.roundResults || [],
            finalResults: null,
            rankUps: prev?.rankUps || [],
          };

          if (event.game_state) {
            return {
              ...baseState,
              isGameStarted: true,
              currentRound: event.game_state.current_location_index || 0,
              currentLocationIndex: event.game_state.current_location_index || 0,
              currentLocation: {
                lat: event.game_state.locations.lat,
                lon: event.game_state.locations.lon,
                url: event.game_state.locations.url,
              },
              hp: event.game_state.hp || {},
              playersGuessed: event.game_state.player_guess || [],
              roundTimer: event.game_state.timer,
              roundStartTime: event.game_state.roundstart_time,
            };
          }

          return baseState;
        });
        break;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = wsService.onEvent(handleWSEvent);
    return unsubscribe;
  }, [handleWSEvent]);

  // Clear localStorage and reset state when server permanently rejects the connection (1008)
  useEffect(() => {
    const unsubscribe = wsService.onPermanentDisconnect((failedCode: string) => {
      console.log('[LobbyContext] Permanent disconnect for lobby:', failedCode);
      setGameState((prev) => {
        // If a different lobby is now active, don't clobber it
        if (prev && prev.lobbyCode !== failedCode) {
          console.log('[LobbyContext] Ignoring — different lobby active:', prev.lobbyCode);
          return prev;
        }
        // Our active lobby (or no lobby) failed permanently — clean up
        clearLobbyFromStorage();
        setIsConnected(false);
        setIsReconnecting(false);
        return null;
      });
    });
    return unsubscribe;
  }, []);

  // Auto-reconnect on page reload
  useEffect(() => {
    // Wait for user to be loaded
    if (!user) {
      console.log('[Reconnect] Waiting for user to load...');
      return;
    }

    // Skip if already connected
    if (isConnected || gameState) {
      console.log('[Reconnect] Already connected, skipping');
      return;
    }

    // Check if there's a saved lobby in localStorage
    const savedLobbyCode = getLobbyFromStorage();
    if (!savedLobbyCode) {
      console.log('[Reconnect] No saved lobby found');
      return;
    }

    console.log('[Reconnect] Found saved lobby, attempting to reconnect:', savedLobbyCode);

    const attemptReconnect = async () => {
      try {
        // Try to reconnect to the saved lobby
        await joinLobby(savedLobbyCode, true);
        console.log('[Reconnect] Successfully reconnected to lobby');
      } catch (error) {
        console.error('[Reconnect] Failed to reconnect to saved lobby:', error);
        // Clear invalid lobby data
        clearLobbyFromStorage();
      }
    };

    attemptReconnect();
  }, [user]); // Run when user changes from null to loaded

  const createLobby = async (): Promise<string> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);
      const response = await apiService.createLobby();
      const inviteCode = response.invite_code;

      await wsService.connect(inviteCode, user.token);
      setIsConnected(true);

      // Save lobby to localStorage for reconnection after page reload
      saveLobbyToStorage(inviteCode);

      setGameState({
        lobbyCode: inviteCode,
        players: [{
          user_id: user.user_id,
          name: user.name || `User${user.user_id}`,
          avatar: user.avatar || '',
          xp: user.xp || 0,
          rank: user.rank || 'Ashborn'
        }],
        host: user.user_id,
        hp: {},
        currentLocationIndex: 0,
        isGameStarted: false,
        isGameEnded: false,
        currentLocation: null,
        playersGuessed: [],
        roundResults: [],
        finalResults: null,
        rankUps: [],
      });

      return inviteCode;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create lobby';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const joinLobby = async (inviteCode: string, isReconnect: boolean = false): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);

      // Try to join via API (may fail with 409 if already in lobby from matchmaking)
      // Skip API join if reconnecting
      if (!isReconnect) {
        try {
          await apiService.joinLobby(inviteCode);
        } catch (apiErr: any) {
          // If already in lobby (409 Conflict), that's fine - continue to connect WebSocket
          const errMsg = apiErr.message || '';
          if (errMsg.includes('409') || errMsg.includes('ALREADY_IN_LOBBY') || errMsg.includes('Conflict')) {
            console.log('Already in lobby, skipping HTTP join and connecting to WebSocket');
          } else {
            // Other errors should be thrown
            throw apiErr;
          }
        }
      }

      // Set initial gameState BEFORE connecting WS so that events (player_joined,
      // game_started, etc.) arriving immediately after onopen are never dropped.
      setGameState({
        lobbyCode: inviteCode,
        players: [{
          user_id: user.user_id,
          name: user.name || `User${user.user_id}`,
          avatar: user.avatar || '',
          xp: user.xp || 0,
          rank: user.rank || 'Ashborn'
        }],
        host: '',
        hp: {},
        currentLocationIndex: 0,
        isGameStarted: false,
        isGameEnded: false,
        currentLocation: null,
        playersGuessed: [],
        roundResults: [],
        finalResults: null,
        rankUps: [],
      });

      // Always connect to WebSocket (whether HTTP join succeeded or not)
      if (isReconnect) setIsReconnecting(true);
      await wsService.connect(inviteCode, user.token);
      setIsConnected(true);
      // In case a concurrent reconnect set isReconnecting, reset it for normal joins
      if (!isReconnect) setIsReconnecting(false);

      // Save lobby to localStorage for reconnection after page reload
      saveLobbyToStorage(inviteCode);

      // If reconnecting, send reconnect message
      if (isReconnect) {
        wsService.reconnect();
      }
    } catch (err: any) {
      setGameState(null);
      const errorMessage = err.message || 'Failed to join lobby';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const leaveLobby = async (): Promise<void> => {
    if (!user || !gameState) {
      return;
    }

    try {
      setError(null);
      // If game ended, lobby is already deleted on backend, just disconnect
      if (gameState.isGameEnded) {
        wsService.disconnect();
        setIsConnected(false);
        setGameState(null);
        clearLobbyFromStorage();
        return;
      }

      await apiService.leaveLobby(gameState.lobbyCode);
      wsService.disconnect();
      setIsConnected(false);
      setGameState(null);
      clearLobbyFromStorage();
    } catch (err: any) {
      // If lobby not found (404) or already left (409), just disconnect anyway
      if (
        err.status === 404 ||
        err.status === 409 ||
        err.message?.includes('404') ||
        err.message?.includes('409') ||
        err.message?.includes('not found') ||
        err.message?.includes('ALREADY_LEAVE_LOBBY')
      ) {
        wsService.disconnect();
        setIsConnected(false);
        setGameState(null);
        clearLobbyFromStorage();
        return;
      }

      const errorMessage = err.message || 'Failed to leave lobby';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const startGame = (): void => {
    if (!gameState || gameState.host !== user?.user_id) {
      setError('Only the host can start the game');
      return;
    }
    wsService.startGame();
  };

  const submitGuess = (lat: number, lon: number): void => {
    if (!gameState || !gameState.isGameStarted) {
      setError('Game has not started');
      return;
    }
    wsService.submitGuess(lat, lon);
  };

  const startNextRound = (): void => {
    if (!gameState || gameState.host !== user?.user_id) {
      setError('Only the host can start the next round');
      return;
    }
    wsService.startRound();
  };

  const endRound = useCallback((): void => {
    if (!gameState || gameState.host !== user?.user_id) {
      setError('Only the host can end the round');
      return;
    }
    console.log('endRound called, sending round_end to server');
    wsService.endRound();
  }, [gameState, user]);

  const endGame = (): void => {
    if (!gameState || gameState.host !== user?.user_id) {
      setError('Only the host can end the game');
      return;
    }
    wsService.endGame();
  };

  const sendMessage = (message: string): void => {
    if (!gameState) {
      setError('Not in a game');
      return;
    }
    wsService.sendMessage(message);
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (isConnected) {
        wsService.disconnect();
      }
    };
  }, [isConnected]);

  const value: LobbyContextType = {
    gameState,
    createLobby,
    joinLobby,
    leaveLobby,
    startGame,
    submitGuess,
    startNextRound,
    endRound,
    endGame,
    sendMessage,
    chatMessages,
    isConnected,
    isReconnecting,
    error,
    disconnectedPlayers,
  };

  return (
    <LobbyContext.Provider value={value}>
      {children}
      {playerStatusNotification.show && (
        <Toast
          message={playerStatusNotification.message}
          onClose={() => setPlayerStatusNotification({ message: '', show: false })}
        />
      )}
    </LobbyContext.Provider>
  );
};
