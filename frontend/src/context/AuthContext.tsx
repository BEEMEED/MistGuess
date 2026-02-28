import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/api';
import type { AuthContextType, User } from '../types/index';
import { ReconnectPrompt } from '../components/ui/ReconnectPrompt';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeLobbies, setActiveLobbies] = useState<Array<{
    InviteCode: string;
    ingame: boolean;
    currentRound?: number;
    totalRounds?: number;
  }>>([]);
  const [showReconnectPrompt, setShowReconnectPrompt] = useState(false);
  const [banMessage, setBanMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const loadUserWithProfile = async () => {
      const user_id_str = apiService.getUser();
      const token = apiService.getToken();

      if (user_id_str && token) {
        const user_id = parseInt(user_id_str);
        try {
          // Load profile to get name and avatar
          const profile = await apiService.getProfile();
          setUser({
            user_id,
            token,
            name: profile.name,
            avatar: profile.avatar,
            xp: profile.xp,
            rank: profile.rank,
            role: profile.role
          });

          // Check for active lobbies
          console.log('Profile lobbies:', profile.lobbys);
          if (profile.lobbys && profile.lobbys.length > 0) {
            console.log('Found active lobbies, showing reconnect prompt:', profile.lobbys);
            setActiveLobbies(profile.lobbys);
            setShowReconnectPrompt(true);
          } else {
            console.log('No active lobbies found');
          }
        } catch (error: any) {
          if (error?.status === 403 && error?.message?.includes('banned')) {
            setBanMessage(error.message);
          } else {
            console.error('Failed to load profile:', error);
            setUser({ user_id, token });
          }
        }
      }

      setIsLoading(false);
    };

    loadUserWithProfile();

    const onBanned = (e: Event) => setBanMessage((e as CustomEvent).detail);
    window.addEventListener('user-banned', onBanned);
    return () => window.removeEventListener('user-banned', onBanned);
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    try {
      const response = await apiService.login(username, password);
      const { user_id, token } = response;

      apiService.saveUser(user_id.toString());
      apiService.setToken(token);
      setUser({ user_id, token }); // Token in cookie
    } catch (error: any) {
      console.error('Login failed:', error);
      throw new Error(error.message || 'Login failed');
    }
  };

  const register = async (username: string, password: string): Promise<void> => {
    try {
      await apiService.register(username, password);
      // After successful registration, automatically log in
      await login(username, password);
    } catch (error: any) {
      console.error('Registration failed:', error);
      throw new Error(error.message || 'Registration failed');
    }
  };

  const loginWithGoogle = async (): Promise<void> => {
    try {
      // Get Google auth URL
      const authUrl = await apiService.getGoogleAuthUrl();
      // Redirect user to Google login
      window.location.href = authUrl;
    } catch (error: any) {
      console.error('Google login failed:', error);
      throw new Error(error.message || 'Google login failed');
    }
  };

  const handleGoogleCallback = async (code: string): Promise<void> => {
    try {
      const response = await apiService.loginWithGoogle(code);
      const { user_id, access_token, clan_id, clan_role, clan_tag } = response;

      apiService.saveUser(user_id.toString());
      apiService.setToken(access_token);

      // Load profile to get name and avatar
      try {
        const profile = await apiService.getProfile();
        setUser({
          user_id,
          token,
          name: profile.name,
          avatar: profile.avatar,
          xp: profile.xp,
          rank: profile.rank,
          role: profile.role,
          clan_id: clan_id || profile.clan_id,
          clan_role: clan_role || profile.clan_role,
          clan_tag: clan_tag || profile.clan_tag,
        });
      } catch (error) {
        // If profile fetch fails, just set basic user info
        console.error('Failed to load profile:', error);
        setUser({
          user_id,
          token,
          clan_id,
          clan_role,
          clan_tag,
        });
      }
    } catch (error: any) {
      console.error('Google callback failed:', error);
      throw new Error(error.message || 'Google callback failed');
    }
  };

  const logout = async (): Promise<void> => {
    await apiService.logout(); // Clear cookie on backend
    apiService.removeUser();
    apiService.removeToken();
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    loginWithGoogle,
    handleGoogleCallback,
    logout,
    isAuthenticated: !!user,
  };

  if (isLoading) {
    return (
      <div className="full-screen flex-center">
        <div className="mistborn-spinner"></div>
      </div>
    );
  }

  console.log('AuthProvider render:', { showReconnectPrompt, activeLobbiesLength: activeLobbies.length });

  if (banMessage) {
    const match = banMessage.match(/until (.+?) for reason: (.+)/);
    const until = match ? new Date(match[1]).toLocaleString() : '—';
    const reason = match ? match[2] : banMessage;
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#040308',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16, fontFamily: 'inherit', zIndex: 9999,
      }}>
        <div style={{
          background: 'rgba(13,11,23,0.9)', border: '1px solid rgba(200,74,74,0.3)',
          borderRadius: 16, padding: '40px 48px', maxWidth: 480, textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔨</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#c84a4a', marginBottom: 8 }}>
            Аккаунт заблокирован
          </div>
          <div style={{ color: 'rgba(220,200,180,0.6)', fontSize: 14, marginBottom: 20 }}>
            Причина: <span style={{ color: '#e8e4d8' }}>{reason}</span>
          </div>
          <div style={{ color: 'rgba(220,200,180,0.4)', fontSize: 13 }}>
            Бан действует до: <span style={{ color: 'rgba(200,74,74,0.8)' }}>{until}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showReconnectPrompt && activeLobbies.length > 0 && (
        <ReconnectPrompt
          lobbies={activeLobbies}
          onClose={() => setShowReconnectPrompt(false)}
        />
      )}
    </AuthContext.Provider>
  );
};
