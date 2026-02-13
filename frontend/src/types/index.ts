// API Response Types

export interface LoginResponse {
  user_id: number;
  access_token: string;
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
  clan_id?: number; // Clan ID
  clan_role?: string; // Clan role (owner, admin, member)
  clan_tag?: string; // Clan tag for display
}

export interface PlayerInfo {
  user_id: number;
  name: string;
  avatar: string;
  xp: number;
  rank: string;
  clan_id?: number;
  clan_tag?: string;
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
  round: number;
  targetLocation: Location;
  guesses: Array<PlayerGuess & { points: number }>;
  winner: {
    player: number;
    distance: number;
  };
  damage: number;
  hp: { [player_id: number]: number };
}

export interface GameState {
  lobbyCode: string;
  players: PlayerInfo[];
  host: number;
  maxPlayers?: number;
  totalRounds?: number;
  currentRound?: number;
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

// Clan Types

export interface Clan {
  id: number;
  name: string;
  tag: string;
  owner_id: number;
  members: number[];
  member_count: number;
  rank: string;
  xp: number;
  reputation: number;
  description: string;
  created_at: string;
  wars_won: number;
  wars_lost: number;
  wars_total: number;
}

export interface ClanWar {
  id: number;
  clan_1_id: number;
  clan_2_id: number;
  rounds: number;
  status: 'pending' | 'ongoing' | 'completed' | 'cancelled';
  clan_1_score: number;
  clan_2_score: number;
  winner_clan_id: number;
  participants: {
    clan_1: number[];
    clan_2: number[];
    pairs?: ClanWarPair[];
  };
  xp_awarded_clan_1: number;
  xp_awarded_clan_2: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface ClanWarPair {
  clan_1: number;
  clan_2: number;
  status: 'pending' | 'ongoing' | 'completed';
  clan_1_score: number | null;
  clan_2_score: number | null;
  lobby_id: number | null;
  winner: number | null;
}

export interface ClanInvite {
  id: number;
  clan_id: number;
  inviter_id: number;
  invitee_id: number;
  code: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  expires_at: string;
  responded_at?: string;
}
