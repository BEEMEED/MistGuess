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
import { toastManager } from './toastManager';

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

    // Add request interceptor to attach Authorization header
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        // Handle 429 separately - show toast and don't propagate error
        if (error.response?.status === 429) {
          toastManager.show('Слишком много запросов. Подождите минуту.', 5000);
          return Promise.resolve({ data: null, status: 429 } as any);
        }
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

  public async createLobby(): Promise<CreateLobbyResponse> {
    const response = await this.client.post<CreateLobbyResponse>('/lobbies', {});
    return response.data;
  }

  public async joinLobby(inviteCode: string): Promise<void> {
    // Backend gets user_id from token, invite_code in URL
    await this.client.put(`/lobbies/${inviteCode}/members`);
  }

  public async leaveLobby(inviteCode: string): Promise<void> {
    // Backend gets user_id from token, invite_code in URL
    await this.client.delete(`/lobbies/${inviteCode}/members`);
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
    await this.client.patch('/profile', {
      new_name: newName
    });
  }

  public async uploadAvatar(file: File): Promise<{ avatar: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.put('/profile/avatar', formData, {
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
    const response = await this.client.get('/admin', {
      params: { page, limit }
    });
    return response.data;
  }

  public async addLocation(lat: number, lon: number, region: string): Promise<void> {
    await this.client.post('/admin/locations', {
      lat,
      lon,
      region
    });
  }

  public async changeLocation(id: number, lat_new: number, lon_new: number, region_new: string): Promise<void> {
    await this.client.patch(`/admin/locations/${id}`, {
      lat_new,
      lon_new,
      region_new
    });
  }

  public async deleteLocation(id: number): Promise<void> {
    await this.client.delete(`/admin/locations/${id}`);
  }

  public async banUser(user_id: number, reason: string): Promise<void> {
    await this.client.delete(`/admin/users/${user_id}/ban`, {
      data: { reason }
    });
  }

  public async makeAdmin(user_id: number): Promise<void> {
    await this.client.patch(`/admin/users/${user_id}/role`);
  }

  // Telegram endpoints

  public async getTelegramLinkCode(): Promise<{ code: string; user_id: number }> {
    const response = await this.client.post<{ code: string; user_id: number }>('/telegram/auth');
    return response.data;
  }

  public async sendTelegramMessage(user_id: number, message: string): Promise<void> {
    await this.client.post(`/admin/users/${user_id}/notifications`, {
      message
    });
  }

  // Solo game endpoints

  public async getSoloRound(): Promise<{ lat: number; lon: number }> {
    const response = await this.client.get<{ lat: number; lon: number }>('/lobbies/random');
    return response.data;
  }

  // Utility methods

  public getBaseURL(): string {
    return API_BASE_URL;
  }
}

// Export singleton instance
export const apiService = new APIService();
