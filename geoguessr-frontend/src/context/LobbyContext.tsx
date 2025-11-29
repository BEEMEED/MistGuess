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
} from '../types';

const LobbyContext = createContext<LobbyContextType | undefined>(undefined);

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
                maxPlayers: event.max_players || prev.maxPlayers,
                totalRounds: event.total_rounds || prev.totalRounds,
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
            totalRounds: event.rounds,
            // Don't set currentRound here - it will be set by round_started event
          };

          // Host automatically starts first round
          if (user?.login === prev.host) {
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
                currentRound: event.round,
                currentLocation: {
                  lat: event.lat,
                  lon: event.lon,
                  url: event.url,
                },
                playersGuessed: [],
                roundTimer: event.timer, // Timer in seconds from backend
                roundStartTime: event.RoundStartTime || Date.now(), // Use server time or fallback to client time
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
                playersGuessed: [...prev.playersGuessed, event.player],
              }
            : null
        );
        break;

      case 'round_ended':
        console.log('round_ended event received:', event);
        setGameState((prev) => {
          if (!prev) return prev;

          const roundResult: RoundResult = {
            round: event.round,
            targetLocation: {
              lat: event.lat,
              lon: event.lon,
              url: prev.currentLocation?.url || '',
            },
            guesses: event.results.map((r) => ({
              player: r.player,
              distance: r.distance,
              lat: r.lat,
              lon: r.lon,
            })),
            winner: event.winner,
            nextRoundTime: event.nextRoundTime, // Server timestamp for countdown sync
          };

          console.log('Created roundResult:', roundResult);
          const newState = {
            ...prev,
            roundResults: [...prev.roundResults, roundResult],
            playersGuessed: [],
          };
          console.log('New state after round_ended:', newState);
          return newState;
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
        setChatMessages((prev) => [
          ...prev,
          {
            player: event.player,
            message: event.message,
            timestamp: Date.now(),
          },
        ]);
        break;

      case 'rank_up':
        console.log('LobbyContext received rank_up event:', event);
        // Save rank ups and update player ranks in gameState
        setGameState((prev) => {
          if (!prev) return prev;

          const updatedPlayers = prev.players.map((player) => {
            const rankUp = event.rank_ups.find((ru) => ru.login === player.login);
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
        setDisconnectedPlayers((prev) => new Set(prev).add(event.player));
        setPlayerStatusNotification({
          message: `${event.player} disconnected. Waiting for reconnection...`,
          show: true,
        });
        setTimeout(() => {
          setPlayerStatusNotification({ message: '', show: false });
        }, 5000);
        break;

      case 'player_reconnected':
        console.log('Player reconnected:', event.player);
        setDisconnectedPlayers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(event.player);
          return newSet;
        });
        setPlayerStatusNotification({
          message: `${event.player} reconnected!`,
          show: true,
        });
        setTimeout(() => {
          setPlayerStatusNotification({ message: '', show: false });
        }, 3000);
        break;

      case 'reconnect_succes':
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
              currentRound: event.game_state.current_round,
              currentLocation: {
                lat: event.game_state.locations.lat,
                lon: event.game_state.locations.lon,
                url: event.game_state.locations.url,
              },
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

  const createLobby = async (maxPlayers: number, rounds: number, timer: number): Promise<string> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);
      const response = await apiService.createLobby(user.login, maxPlayers, rounds, timer);
      const inviteCode = response.InviteCode;

      // Connect to WebSocket
      await wsService.connect(inviteCode, user.token);
      setIsConnected(true);

      // Initialize game state
      setGameState({
        lobbyCode: inviteCode,
        players: [{
          login: user.login,
          name: user.name || user.login,
          avatar: user.avatar || ''
        }],
        host: user.login,
        maxPlayers,
        totalRounds: rounds,
        currentRound: 0,
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
          await apiService.joinLobby(user.login, inviteCode);
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

      // Always connect to WebSocket (whether HTTP join succeeded or not)
      await wsService.connect(inviteCode, user.token);
      setIsConnected(true);

      // If reconnecting, send reconnect message
      if (isReconnect) {
        wsService.reconnect();
      }

      // Initialize game state (will be updated by WebSocket events)
      setGameState({
        lobbyCode: inviteCode,
        players: [{
          login: user.login,
          name: user.name || user.login,
          avatar: user.avatar || ''
        }],
        host: '', // Will be determined from WS events
        maxPlayers: 0, // Unknown initially
        totalRounds: 0, // Unknown initially
        currentRound: 0,
        isGameStarted: false,
        isGameEnded: false,
        currentLocation: null,
        playersGuessed: [],
        roundResults: [],
        finalResults: null,
        rankUps: [],
      });
    } catch (err: any) {
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
        return;
      }

      await apiService.leaveLobby(user.login, gameState.lobbyCode);
      wsService.disconnect();
      setIsConnected(false);
      setGameState(null);
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
        return;
      }

      const errorMessage = err.message || 'Failed to leave lobby';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const startGame = (): void => {
    if (!gameState || gameState.host !== user?.login) {
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
    if (!gameState || gameState.host !== user?.login) {
      setError('Only the host can start the next round');
      return;
    }
    wsService.startRound();
  };

  const endRound = useCallback((): void => {
    if (!gameState || gameState.host !== user?.login) {
      setError('Only the host can end the round');
      return;
    }
    console.log('endRound called, sending round_end to server');
    wsService.endRound();
  }, [gameState, user]);

  const endGame = (): void => {
    if (!gameState || gameState.host !== user?.login) {
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
