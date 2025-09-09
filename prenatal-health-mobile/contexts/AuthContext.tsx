import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthContextType } from '../types';
import { storage } from '../utils/storage';
import apiService from '../utils/apiService';
import { Alert } from 'react-native';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
    checkApiConnection();
  }, []);

  const checkApiConnection = async () => {
    const isHealthy = await apiService.healthCheck();
    if (!isHealthy) {
      console.warn('API connection failed. Some features may not work properly.');
    }
  };

  const loadUser = async () => {
    try {
      setIsLoading(true);
      
      // Try to get user from API first (validates token)
      const currentUser = await apiService.getCurrentUser();
      
      if (currentUser) {
        setUser(currentUser);
      } else {
        // Fallback to local storage
        const savedUser = await storage.getUser();
        setUser(savedUser);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      // Clear potentially invalid data
      await apiService.clearTokens();
      await storage.removeUser();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      const response = await apiService.login({ email, password });
      
      if (response.success && response.data) {
        const userData: User = {
          id: response.data.user.id,
          email: response.data.user.email,
          name: response.data.user.name,
          profileCompleted: response.data.user.profileCompleted || false,
          pregnancyWeek: response.data.user.pregnancyWeek,
          dueDate: response.data.user.dueDate,
          preferredLanguage: response.data.user.preferredLanguage || 'en',
        };
        
        // Save to local storage as backup
        await storage.setUser(userData);
        setUser(userData);
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Show user-friendly error message
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          Alert.alert(
            'Connection Error',
            'Unable to connect to the server. Please check your internet connection and try again.'
          );
        } else {
          Alert.alert('Login Failed', error.message);
        }
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      setIsLoading(true);
      
      const response = await apiService.register({ email, password, name });
      
      if (response.success && response.data) {
        const userData: User = {
          id: response.data.user.id,
          email: response.data.user.email,
          name: response.data.user.name,
          profileCompleted: false,
          preferredLanguage: 'en',
        };
        
        // Save to local storage as backup
        await storage.setUser(userData);
        setUser(userData);
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      // Show user-friendly error message
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          Alert.alert(
            'Connection Error',
            'Unable to connect to the server. Please check your internet connection and try again.'
          );
        } else {
          Alert.alert('Registration Failed', error.message);
        }
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await apiService.logout();
      await storage.removeUser();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Even if API logout fails, clear local data
      await storage.removeUser();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      if (!user) return;

      const response = await apiService.updateProfile(data);
      
      if (response.success) {
        const updatedUser = { ...user, ...data };
        await storage.setUser(updatedUser);
        setUser(updatedUser);
      } else {
        throw new Error(response.error || 'Profile update failed');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      
      // Fallback to local storage for offline capability
      if (user) {
        const updatedUser = { ...user, ...data };
        await storage.setUser(updatedUser);
        setUser(updatedUser);
      }
      
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
