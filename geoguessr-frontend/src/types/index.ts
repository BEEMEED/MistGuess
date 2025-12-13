// API Response Types

export interface LoginResponse {
  user_id: number;
  token: string;
}

export interface CreateLobbyRequest {
  timer: number;
}

export interface CreateLobbyResponse {
  InviteCode: string;
}

export interface JoinLobbyRequest {
  InviteCode: string;
}

export interface LeaveLobbyRequest {
  InviteCode: string;
}

// Lobby and Game State Types

export interface Location {
  lat: number;
  lon: number;
  url: string;
}

export interface Lobby {
  host: string;
  max_players: number;
  users: string[];
  InviteCode: string;
  RoundsNum: number;
  locations: { [key: string]: Location };
}

export interface User {
  user_id: number;
  token: string;
  name?: string; // Display name from profile
  avatar?: string; // Avatar URL from profile
  xp?: number; // Experience points
  rank?: string; // Current rank
  role?: string; // User role (admin or user)
}

export interface PlayerInfo {
  user_id: number;
  name: string;
  avatar: string;
  xp: number;
  rank: string;
}

// WebSocket Event Types

export interface WSPlayerJoinedEvent {
  type: 'player_joined';
  player: number;
  players: PlayerInfo[];
  host: string;
}

export interface WSPlayerLeftEvent {
  type: 'player_left';
  player: number;
  players: PlayerInfo[];
}

export interface WSGameStartedEvent {
  type: 'game_started';
  hp: { [player_id: number]: number };
  timer: number;
}

export interface WSRoundStartedEvent {
  type: 'round_started';
  round: number;
  lat: number;
  lon: number;
  url: string;
}

export interface WSPlayerGuessedEvent {
  type: 'player_guessed';
  player: number;
}

export interface WSRoundEndedEvent {
  type: 'round_ended';
  winner: number;
  damage: number;
  hp: { [player_id: number]: number };
  results: Array<{
    player: number;
    distance: number;
    lat: number;
    lon: number;
    points: number;
  }>;
  lat: number;
  lon: number;
}

export interface WSRoundTimedoutEvent {
  type: 'round_timedout';
  hp: { [player_id: number]: number };
  num_guesses: number;
}

export interface WSGameEndedEvent {
  type: 'game_ended';
  winner: number;
  total_distances: { [player: number]: number };
  players: PlayerInfo[];
}

export interface WSBroadcastEvent {
  type: 'broadcast';
  player: number;
  message: string;
}

export interface WSRankUpEvent {
  type: 'rank_up';
  rank_ups: Array<{
    user_id: number;
    old_rank: string;
    new_rank: string;
  }>;
}

export interface WSPlayerDisconnectedEvent {
  type: 'player_disconnected';
  player: number;
}

export interface WSPlayerReconnectedEvent {
  type: 'player_reconnected';
  player: number;
}

export interface WSReconnectSuccessEvent {
  type: 'reconnect_succes';
  host: string;
  game_state?: {
    current_location_index: number;
    locations: {
      lat: number;
      lon: number;
      url: string;
    };
    roundstart_time: number;
    timer: number;
    hp: { [player_id: number]: number };
    PlayerHasGuessed: boolean;
    player_guess: string[];
  };
  players: PlayerInfo[];
}

export type WSEvent =
  | WSPlayerJoinedEvent
  | WSPlayerLeftEvent
  | WSGameStartedEvent
  | WSRoundStartedEvent
  | WSPlayerGuessedEvent
  | WSRoundEndedEvent
  | WSRoundTimedoutEvent
  | WSGameEndedEvent
  | WSBroadcastEvent
  | WSRankUpEvent
  | WSPlayerDisconnectedEvent
  | WSPlayerReconnectedEvent
  | WSReconnectSuccessEvent;

// Client to Server WebSocket Messages

export interface WSGameStartMessage {
  type: 'game_start';
}

export interface WSSubmitGuessMessage {
  type: 'submit_guess';
  lat: number;
  lon: number;
}

export interface WSRoundStartMessage {
  type: 'round_start';
}

export interface WSRoundEndMessage {
  type: 'round_end';
}

export interface WSGameEndMessage {
  type: 'game_end';
}

export interface WSPlayerJoinedMessage {
  type: 'player_joined';
}

export interface WSPlayerLeftMessage {
  type: 'player_left';
}

export interface WSBroadcastMessage {
  type: 'broadcast';
  message: string;
}

export interface WSPlayerReconnectMessage {
  type: 'player_reconnect';
}

export type WSClientMessage =
  | WSGameStartMessage
  | WSSubmitGuessMessage
  | WSRoundStartMessage
  | WSRoundEndMessage
  | WSGameEndMessage
  | WSPlayerJoinedMessage
  | WSPlayerLeftMessage
  | WSBroadcastMessage
  | WSPlayerReconnectMessage;

// Game State Types

export interface PlayerGuess {
  player: number;
  distance: number;
  lat: number;
  lon: number;
}

export interface RoundResult {
  targetLocation: Location;
  guesses: Array<PlayerGuess & { points: number }>;
  winner: number;
  damage: number;
  hp: { [player_id: number]: number };
}

export interface GameState {
  lobbyCode: string;
  players: PlayerInfo[];
  host: number;
  hp: { [player_id: number]: number };
  currentLocationIndex: number;
  isGameStarted: boolean;
  isGameEnded: boolean;
  currentLocation: Location | null;
  playersGuessed: string[];
  roundResults: RoundResult[];
  finalResults: {
    winner: number;
    totalDistances: { [player: number]: number };
  } | null;
  rankUps: Array<{
    user_id: number;
    old_rank: string;
    new_rank: string;
  }>;
  roundTimer?: number;
  roundStartTime?: number;
}

// UI State Types

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface MapMarker {
  position: Coordinates;
  label: string;
  color?: string;
}

// Auth Context Types

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  handleGoogleCallback: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

// Lobby Context Types

export interface LobbyContextType {
  gameState: GameState | null;
  createLobby: () => Promise<string>;
  joinLobby: (inviteCode: string, isReconnect?: boolean) => Promise<void>;
  leaveLobby: () => Promise<void>;
  startGame: () => void;
  submitGuess: (lat: number, lon: number) => void;
  startNextRound: () => void;
  endRound: () => void;
  endGame: () => void;
  sendMessage: (message: string) => void;
  chatMessages: Array<{ player: string; message: string; timestamp: number }>;
  isConnected: boolean;
  error: string | null;
  disconnectedPlayers: Set<string>;
}

// Error Types

export interface APIError {
  message: string;
  status?: number;
  detail?: string;
}

// Matchmaking Types

export interface WSQueueJoinedEvent {
  type: 'queue_joined';
  position: number;
}

export interface WSMatchFoundEvent {
  type: 'match_found';
  LobbyCode: string;
  opponent: PlayerInfo;
  countdown: number;
}

export interface WSCountdownEvent {
  type: 'countdown';
  seconds: number;
}

export interface WSRedirectEvent {
  type: 'redirect';
  LobbyCode: string;
}

export interface WSMatchmakingErrorEvent {
  type: 'error';
  message: string;
}

export type WSMatchmakingEvent =
  | WSQueueJoinedEvent
  | WSMatchFoundEvent
  | WSCountdownEvent
  | WSRedirectEvent
  | WSMatchmakingErrorEvent;

export interface WSCancelQueueMessage {
  type: 'cancel_queue';
}

export interface MatchmakingState {
  isInQueue: boolean;
  queuePosition: number | null;
  matchFound: boolean;
  lobbyCode: string | null;
  opponent: PlayerInfo | null;
  countdown: number | null;
  error: string | null;
}

export interface MatchmakingContextType {
  state: MatchmakingState;
  joinQueue: () => Promise<void>;
  leaveQueue: () => void;
  isConnected: boolean;
  resetRedirectFlag: () => void;
}
