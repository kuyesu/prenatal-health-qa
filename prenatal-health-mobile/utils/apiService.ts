import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.1.177:3000' // Change to your web app's URL
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_data';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

class ApiService {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  // Token management
  async getAccessToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  async setTokens(tokens: AuthTokens): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, tokens.accessToken);
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
      
      // Store expiration time
      const expirationTime = Date.now() + (tokens.expiresIn * 1000);
      await AsyncStorage.setItem('token_expiry', expirationTime.toString());
    } catch (error) {
      console.error('Error setting tokens:', error);
    }
  }

  async clearTokens(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, 'token_expiry', USER_KEY]);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  async isTokenExpired(): Promise<boolean> {
    try {
      const expiryTime = await AsyncStorage.getItem('token_expiry');
      if (!expiryTime) return true;
      
      return Date.now() > parseInt(expiryTime);
    } catch (error) {
      console.error('Error checking token expiry:', error);
      return true;
    }
  }

  async refreshAccessToken(): Promise<boolean> {
    try {
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) return false;

      const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        await this.clearTokens();
        return false;
      }

      const data: ApiResponse<AuthTokens> = await response.json();
      if (data.success && data.data) {
        await this.setTokens(data.data);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  }

  // HTTP request helper with automatic token handling
  async makeRequest<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      let accessToken = await this.getAccessToken();

      // Check if token is expired and refresh if needed
      if (accessToken && await this.isTokenExpired()) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          accessToken = await this.getAccessToken();
        } else {
          // Redirect to login if refresh fails
          await this.clearTokens();
          throw new Error('Session expired. Please login again.');
        }
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
      });

      const data: ApiResponse<T> = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Unauthorized - try to refresh token
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            // Retry the request with new token
            return this.makeRequest(endpoint, options);
          } else {
            await this.clearTokens();
            throw new Error('Session expired. Please login again.');
          }
        }
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error('API request error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred',
      };
    }
  }

  // Authentication endpoints
  async login(credentials: LoginRequest): Promise<ApiResponse<{ user: any; tokens: AuthTokens }>> {
    try {
      const response = await this.makeRequest<{ user: any; tokens: AuthTokens }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      if (response.success && response.data) {
        await this.setTokens(response.data.tokens);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  }

  async register(userData: RegisterRequest): Promise<ApiResponse<{ user: any; tokens: AuthTokens }>> {
    try {
      const response = await this.makeRequest<{ user: any; tokens: AuthTokens }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      if (response.success && response.data) {
        await this.setTokens(response.data.tokens);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  async logout(): Promise<void> {
    try {
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      
      if (refreshToken) {
        // Notify server about logout
        await this.makeRequest('/api/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      await this.clearTokens();
    }
  }

  async getCurrentUser(): Promise<any | null> {
    try {
      const userData = await AsyncStorage.getItem(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async updateProfile(profileData: any): Promise<ApiResponse<any>> {
    return this.makeRequest('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  // Chat endpoints
  async sendMessage(message: string): Promise<ApiResponse<any>> {
    // Force English only
    return this.makeRequest('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ 
        question: message,
        language: 'en',
        platform: 'mobile'
      }),
    });
  }

  async getChatHistory(): Promise<ApiResponse<any[]>> {
    return this.makeRequest('/api/chat/history');
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

export const apiService = new ApiService();
export default apiService;
