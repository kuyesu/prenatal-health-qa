import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, OnboardingData } from '../types';

const USER_KEY = 'user';
const ONBOARDING_KEY = 'onboarding';
const CHAT_HISTORY_KEY = 'chat_history';

export const storage = {
  // User data
  async getUser(): Promise<User | null> {
    try {
      const userString = await AsyncStorage.getItem(USER_KEY);
      return userString ? JSON.parse(userString) : null;
    } catch (error) {
      console.error('Error getting user from storage:', error);
      return null;
    }
  },

  async setUser(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error setting user in storage:', error);
    }
  },

  async removeUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(USER_KEY);
    } catch (error) {
      console.error('Error removing user from storage:', error);
    }
  },

  // Onboarding data
  async getOnboardingData(): Promise<OnboardingData | null> {
    try {
      const dataString = await AsyncStorage.getItem(ONBOARDING_KEY);
      return dataString ? JSON.parse(dataString) : null;
    } catch (error) {
      console.error('Error getting onboarding data from storage:', error);
      return null;
    }
  },

  async setOnboardingData(data: OnboardingData): Promise<void> {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error setting onboarding data in storage:', error);
    }
  },

  async removeOnboardingData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ONBOARDING_KEY);
    } catch (error) {
      console.error('Error removing onboarding data from storage:', error);
    }
  },

  // Chat history
  async getChatHistory(): Promise<any[]> {
    try {
      const historyString = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
      return historyString ? JSON.parse(historyString) : [];
    } catch (error) {
      console.error('Error getting chat history from storage:', error);
      return [];
    }
  },

  async setChatHistory(history: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error setting chat history in storage:', error);
    }
  },

  async addChatMessage(message: any): Promise<void> {
    try {
      const history = await this.getChatHistory();
      history.push(message);
      await this.setChatHistory(history);
    } catch (error) {
      console.error('Error adding chat message to storage:', error);
    }
  },

  // General storage utilities
  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },
};
