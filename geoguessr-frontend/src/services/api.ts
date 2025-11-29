import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';
import type {
  LoginResponse,
  CreateLobbyRequest,
  CreateLobbyResponse,
  JoinLobbyRequest,
  LeaveLobbyRequest,
  APIError,
} from '../types';

const API_BASE_URL = 'http://localhost:8000';

class APIService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Send cookies with requests
    });

    // Interceptor no longer needed - cookies are sent automatically
    // this.client.interceptors.request.use(...)

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: AxiosError): APIError {
    if (error.response) {
      // Server responded with error status
      return {
        message: (error.response.data as any)?.detail || 'An error occurred',
        status: error.response.status,
        detail: JSON.stringify(error.response.data),
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        message: 'No response from server. Please check your connection.',
      };
    } else {
      // Something else happened
      return {
        message: error.message || 'An unexpected error occurred',
      };
    }
  }

  // User management
  public saveUser(username: string): void {
    localStorage.setItem('username', username);
  }

  public getUser(): string | null {
    return localStorage.getItem('username');
  }

  public removeUser(): void {
    localStorage.removeItem('username');
  }

  // Token management (for WebSocket - cookies can't be used in WS query params)
  public setToken(token: string): void {
    localStorage.setItem('token', token);
  }

  public getToken(): string | null {
    return localStorage.getItem('token');
  }

  public removeToken(): void {
    localStorage.removeItem('token');
  }

  // Logout - clear cookie on backend
  public async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // Authentication endpoints

  public async login(username: string, password: string): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/auth/login', {
      login: username,
      password: password,
    });
    return response.data;
  }

  public async register(username: string, password: string): Promise<void> {
    await this.client.post('/auth/register', {
      login: username,
      password: password,
    });
  }

  // Google OAuth endpoints
  public async getGoogleAuthUrl(): Promise<string> {
    const response = await this.client.post<{ auth_url: string }>('/auth/google');
    return response.data.auth_url;
  }

  public async loginWithGoogle(code: string): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/auth/google/callback', {
      code: code,
    });
    return response.data;
  }

  // Lobby endpoints

  public async createLobby(
    username: string,
    maxPlayers: number,
    rounds: number,
    timer: number
  ): Promise<CreateLobbyResponse> {
    // Backend gets login from token, only send max_players, rounds, and timer
    const response = await this.client.post<CreateLobbyResponse>(
      '/lobbies/create',
      {
        max_players: maxPlayers,
        rounds: rounds,
        timer: timer,
      }
    );
    return response.data;
  }

  public async joinLobby(username: string, inviteCode: string): Promise<void> {
    // Backend gets login from token, only send InviteCode
    await this.client.post('/lobbies/join', { InviteCode: inviteCode });
  }

  public async leaveLobby(username: string, inviteCode: string): Promise<void> {
    // Backend gets login from token, only send InviteCode
    await this.client.delete('/lobbies/leave', {
      data: { InviteCode: inviteCode }
    });
  }

  // Profile endpoints

  public async getProfile(): Promise<{
    name: string;
    avatar: string;
    xp: number;
    rank: string;
    role: string;
    lobbys?: Array<{
      InviteCode: string;
      ingame: boolean;
      currentRound?: number;
      totalRounds?: number;
    }>;
  }> {
    const response = await this.client.get('/profile/me');
    return response.data;
  }

  public async updateName(newName: string): Promise<void> {
    await this.client.post('/profile/name', null, {
      params: { new_name: newName }
    });
  }

  public async uploadAvatar(file: File): Promise<{ avatar: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post('/profile/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  public async getAvatarUrl(): Promise<string> {
    const response = await this.client.get('/profile/avatar');
    return response.data;
  }

  // Admin endpoints

  public async getAdminPanel(page: number = 1, limit: number = 20): Promise<{
    data_user: any;
    data_lobby: any;
    data_location: any;
    total_users: number;
    total_lobbies: number;
    total_locations: number;
    page: number;
    limit: number;
  }> {
    const response = await this.client.get('/admin/main', {
      params: { page, limit }
    });
    return response.data;
  }

  public async addLocation(lat: number, lon: number, region: string): Promise<void> {
    await this.client.post('/admin/add_location', null, {
      params: { lat, lon, region }
    });
  }

  public async changeLocation(id: number, lat_new: number, lon_new: number, region_new: string): Promise<void> {
    await this.client.patch('/admin/change_location', null, {
      params: { id, lat_new, lon_new, region_new }
    });
  }

  public async deleteLocation(id: number): Promise<void> {
    await this.client.delete('/admin/delete_location', {
      params: { id }
    });
  }

  public async banUser(login: string, reason: string): Promise<void> {
    await this.client.delete('/admin/ban_user', {
      params: { login, reason }
    });
  }

  public async makeAdmin(login: string): Promise<void> {
    await this.client.patch('/admin/add_admin', null, {
      params: { login }
    });
  }

  // Telegram endpoints

  public async getTelegramLinkCode(): Promise<{ code: string; login: string }> {
    const response = await this.client.post<{ code: string; login: string }>('/telegram/auth');
    return response.data;
  }

  public async sendTelegramMessage(login: string, message: string): Promise<void> {
    await this.client.post('/admin/send_telegram_message', null, {
      params: { login, message }
    });
  }

  // Solo game endpoints

  public async getSoloRound(): Promise<{ lat: number; lon: number; url: string }> {
    const response = await this.client.post<{ lat: number; lon: number; url: string }>('/lobbies/solo');
    return response.data;
  }

  // Utility methods

  public getBaseURL(): string {
    return API_BASE_URL;
  }
}

// Export singleton instance
export const apiService = new APIService();
