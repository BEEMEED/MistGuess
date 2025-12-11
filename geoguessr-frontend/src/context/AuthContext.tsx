import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/api';
import type { AuthContextType, User } from '../types';
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
        } catch (error) {
          // If profile fetch fails, just set basic user info
          console.error('Failed to load profile:', error);
          setUser({ user_id, token });
        }
      }

      setIsLoading(false);
    };

    loadUserWithProfile();
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
      const { user_id, token } = response;

      apiService.saveUser(user_id.toString());
      apiService.setToken(token);

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
          role: profile.role
        });
      } catch (error) {
        // If profile fetch fails, just set basic user info
        console.error('Failed to load profile:', error);
        setUser({ user_id, token });
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
