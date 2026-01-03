import type { AuthResponse } from '../types/auth';

/**
 * Mock Auth Service - To be replaced by Agent 2's implementation
 * This provides the interface for authentication operations
 */
class AuthService {
  /**
   * Login user with email and password
   * @param email - User email
   * @param password - User password
   * @param rememberMe - Whether to persist session
   * @returns Promise with auth response
   */
  async login(
    email: string,
    password: string,
    _rememberMe: boolean
  ): Promise<AuthResponse> {
    // Mock implementation - will be replaced by Agent 2
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate API call (rememberMe will be used in real implementation)
        if (email === 'test@example.com' && password === 'Test123!') {
          resolve({
            success: true,
            message: 'Login successful',
            token: 'mock-jwt-token',
            user: {
              id: '1',
              email: email,
              username: 'testuser',
            },
          });
        } else {
          reject(new Error('Invalid credentials'));
        }
      }, 1000);
    });
  }

  /**
   * Register new user
   * @param username - User username
   * @param email - User email
   * @param password - User password
   * @returns Promise with auth response
   */
  async signup(
    username: string,
    email: string,
    _password: string
  ): Promise<AuthResponse> {
    // Mock implementation - will be replaced by Agent 2
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate API call (password will be used in real implementation)
        if (email === 'existing@example.com') {
          reject(new Error('Email already exists'));
        } else {
          resolve({
            success: true,
            message: 'Registration successful',
            token: 'mock-jwt-token',
            user: {
              id: '1',
              email: email,
              username: username,
            },
          });
        }
      }, 1000);
    });
  }

  /**
   * Initiate OAuth login
   * @param provider - OAuth provider (google, github, etc.)
   */
  async initiateOAuth(provider: string): Promise<void> {
    // Mock implementation - will be replaced by Agent 4
    console.log(`Initiating OAuth with ${provider}`);
    // This will redirect to OAuth provider
  }
}

export const authService = new AuthService();
